import { Injectable } from '@angular/core';
import { ReplayParserService, ParseOptions } from './replay-parser.service';
import { COMPRESSION_SIGNATURES, ZIP_COMPRESSION_METHODS } from '../../constants/replay-cache.constants';

@Injectable({
  providedIn: 'root'
})
export class ReplayFileService {
  constructor(private replayParserService: ReplayParserService) {}

  async processReplayFile(file: File, parseOptions: ParseOptions): Promise<any> {
    const decompressedFile = await this.decompressFile(file);
    return this.replayParserService.parseReplay(decompressedFile, parseOptions);
  }

  async decompressFile(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const compressedData = e.target?.result as ArrayBuffer;
          if (!compressedData) {
            reject(new Error('Failed to read file data'));
            return;
          }

          const bytes = new Uint8Array(compressedData);
          
          // Check if it's gzip format
          if (bytes[0] === COMPRESSION_SIGNATURES.GZIP[0] && bytes[1] === COMPRESSION_SIGNATURES.GZIP[1]) {
            try {
              const decompressedStream = new DecompressionStream('gzip');
              const stream = new ReadableStream({
                start(controller) {
                  controller.enqueue(bytes);
                  controller.close();
                }
              });

              const decompressedData = await new Response(
                stream.pipeThrough(decompressedStream)
              ).arrayBuffer();

              const decompressedFile = new File(
                [decompressedData], 
                file.name.replace(/\.(gz|zip)$/, '.mythrec'),
                { type: 'application/octet-stream' }
              );
              
              resolve(decompressedFile);
            } catch (gzipError) {
              reject(new Error(`GZIP decompression failed: ${gzipError instanceof Error ? gzipError.message : 'Unknown error'}`));
            }
          }
          // Check if it's zip format
          else if (bytes[0] === COMPRESSION_SIGNATURES.ZIP[0] && bytes[1] === COMPRESSION_SIGNATURES.ZIP[1]) {
            try {
              const decompressedFile = await this.extractFromZip(bytes, file.name);
              resolve(decompressedFile);
            } catch (zipError) {
              reject(new Error(`ZIP decompression failed: ${zipError instanceof Error ? zipError.message : 'Unknown error'}`));
            }
          }
          else {
            // Not compressed, return as is
            resolve(file);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async extractFromZip(zipBytes: Uint8Array, originalFileName: string): Promise<File> {
    // Find the first file entry in the ZIP
    const centralDirStart = this.findCentralDirectory(zipBytes);
    if (centralDirStart === -1) {
      throw new Error('Invalid ZIP file: Central directory not found');
    }

    // Read central directory record
    const centralDir = zipBytes.slice(centralDirStart);
    if (centralDir.length < 46) {
      throw new Error('Invalid ZIP file: Central directory too short');
    }

    // Extract file information from central directory
    const compressedSize = this.readUint32LE(centralDir, 20);
    const uncompressedSize = this.readUint32LE(centralDir, 24);
    const compressionMethod = this.readUint16LE(centralDir, 10);
    const fileNameLength = this.readUint16LE(centralDir, 28);
    const extraFieldLength = this.readUint16LE(centralDir, 30);
    const localHeaderOffset = this.readUint32LE(centralDir, 42);

    // Find local file header
    const localHeader = zipBytes.slice(localHeaderOffset);
    if (localHeader.length < 30) {
      throw new Error('Invalid ZIP file: Local header too short');
    }

    // Skip local header and filename/extra fields to get to compressed data
    const localFileNameLength = this.readUint16LE(localHeader, 26);
    const localExtraFieldLength = this.readUint16LE(localHeader, 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressedData = zipBytes.slice(dataStart, dataStart + compressedSize);

    // Decompress based on compression method
    if (compressionMethod === ZIP_COMPRESSION_METHODS.STORED) {
      // No compression
      return new File(
        [compressedData], 
        originalFileName.replace(/\.(gz|zip)$/, '.mythrec'),
        { type: 'application/octet-stream' }
      );
    } else if (compressionMethod === ZIP_COMPRESSION_METHODS.DEFLATE) {
      // Deflate compression
      try {
        const decompressedStream = new DecompressionStream('deflate-raw');
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(compressedData);
            controller.close();
          }
        });

        const decompressedData = await new Response(
          stream.pipeThrough(decompressedStream)
        ).arrayBuffer();

        return new File(
          [decompressedData], 
          originalFileName.replace(/\.(gz|zip)$/, '.mythrec'),
          { type: 'application/octet-stream' }
        );
      } catch (deflateError) {
        throw new Error('Failed to decompress ZIP file data');
      }
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
    }
  }

  private findCentralDirectory(zipBytes: Uint8Array): number {
    // Look for End of Central Directory signature (0x06054b50) from the end
    for (let i = zipBytes.length - 22; i >= 0; i--) {
      if (zipBytes[i] === 0x50 && zipBytes[i + 1] === 0x4b && 
          zipBytes[i + 2] === 0x05 && zipBytes[i + 3] === 0x06) {
        // Found EOCD, read central directory offset
        const centralDirOffset = this.readUint32LE(zipBytes, i + 16);
        return centralDirOffset;
      }
    }
    return -1;
  }

  private readUint16LE(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  private readUint32LE(bytes: Uint8Array, offset: number): number {
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
  }

  async isFileCompressed(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
        const isGzip = bytes[0] === COMPRESSION_SIGNATURES.GZIP[0] && bytes[1] === COMPRESSION_SIGNATURES.GZIP[1];
        const isZip = bytes[0] === COMPRESSION_SIGNATURES.ZIP[0] && bytes[1] === COMPRESSION_SIGNATURES.ZIP[1];
        resolve(isGzip || isZip);
      };
      
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file.slice(0, 4));
    });
  }
}