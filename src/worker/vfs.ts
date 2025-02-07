import fs from "node:fs";
import path from "node:path";

const PROC_FD_MAX = 2;

type FileHandle = {
    name: string;
    readOffset: number;
}

module.exports.createVfs = (files: Record<string, Buffer>, stdFdWriter: (fd: number, buffer: NodeJS.ArrayBufferView) => void) => {
    let currentFd = PROC_FD_MAX;
    const handles = new Map<number, FileHandle>();

    return {
        constants: fs.constants,
        open(filepath: string, flags: string | number = 'r', mode: string | number = 0o666, callback: (err: Error | null, fd: number) => void) {
            const filename = path.normalize(filepath);
            if (files[filename] !== undefined) {
                const fd = ++currentFd;
                handles.set(fd, {
                    name: filename,
                    readOffset: 0
                });
                callback(null, fd);
                return;
            }

            callback(new Error('File not found.'), 0);
        },
        writeSync(fd: number, ...args: any[]) {
            if (fd <= PROC_FD_MAX) {
                stdFdWriter(fd, args[0]);
                return args[0].length;
            }
            throw new Error('Writing to files is not allowed.');
        },
        write(fd: number, ...args: any[]) {
            if (fd <= PROC_FD_MAX) {
                stdFdWriter(fd, args[0]);
                args[args.length - 1](null, args[0].length, args[0]);
                return;
            }
            args[args.length - 1](new Error('Writing to files is not allowed.'), null);
        },
        fstat(fd: number, ...args: any[]) {
            if (fd <= PROC_FD_MAX) return fs.fstat.apply(fs, [fd, ...args] as any);
            const cb = args[args.length - 1];
            const file = handles.get(fd);

            if (file === undefined) {
                cb(new Error('File handle does not exist'), null);
                return;
            }

            cb(null, {
                dev: 0,
                ino: 0,
                mode: 33206,
                nlink: 1,
                uid: 0,
                gid: 0,
                rdev: 0,
                blksize: 4096,
                size: files[file.name].length,
                blocks: 1,
                atimeMs: 0,
                mtimeMs: 0,
                ctimeMs: 0,
                birthtimeMs: 0,
                isDirectory() { return false }
            });
        },
        read<T extends Buffer | Uint8Array>(fd: number, buffer: T, offset: number, length: number, position: number | bigint | null, cb: (err: Error | null, bytesRead: number | null, buffer: T | null) => void) {
            if (fd <= PROC_FD_MAX) return fs.read.apply(fs, [fd, buffer, offset, length, position, cb] as any);
            const file = handles.get(fd);

            if (file === undefined) {
                cb(new Error('File handle does not exist'), null, null);
                return;
            }

            const content = files[file.name];

            const startPos = Number(position ?? 0) + file.readOffset;
            let endPos = startPos + length;
            if (endPos > content.length) {
                endPos = content.length;
            }

            const data = content.subarray(startPos, endPos);
            data.copy(buffer, offset);
            file.readOffset += data.length;

            cb(null, data.length, buffer);
        },
        close(fd: number, cb: fs.NoParamCallback) {
            if (!handles.has(fd)) return cb(new Error('Handle already closed.'));
            handles.delete(fd);
            cb(null);
        }
    }
}

