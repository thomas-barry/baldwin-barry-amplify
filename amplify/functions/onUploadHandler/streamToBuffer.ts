import { Readable } from 'stream';

// maxBytes backs up the Content-Length check in the handler: it stops reading
// as soon as the stream runs past the ceiling instead of buffering all of it.
export default async function streamToBuffer(readableStream: Readable, maxBytes = Infinity): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    readableStream.on('data', data => {
      let chunk: Buffer;
      if (typeof data === 'string') {
        chunk = Buffer.from(data, 'utf-8');
      } else if (data instanceof Buffer) {
        chunk = data;
      } else {
        chunk = Buffer.from(JSON.stringify(data), 'utf-8');
      }
      total += chunk.length;
      if (total > maxBytes) {
        readableStream.destroy();
        reject(new Error(`stream exceeds ${maxBytes} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}
