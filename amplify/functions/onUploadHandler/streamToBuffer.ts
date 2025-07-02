import { Readable } from 'stream';

export default async function streamToBuffer(readableStream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', data => {
      if (typeof data === 'string') {
        chunks.push(Buffer.from(data, 'utf-8'));
      } else if (data instanceof Buffer) {
        chunks.push(data);
      } else {
        const jsonData = JSON.stringify(data);
        chunks.push(Buffer.from(jsonData, 'utf-8'));
      }
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}
