import { Client } from 'ssh2';
import { createReadStream, createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { storage } from './storage';

const pipelineAsync = promisify(pipeline);

interface SftpConnection {
  client: Client;
  sftp: any;
}

interface SftpFileInfo {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
  permissions: string;
}

export class SftpService {
  private static readonly SFTP_HOST = process.env.SFTP_HOST || '128.140.82.20';
  private static readonly SFTP_PORT = parseInt(process.env.SFTP_PORT || '22');

  /**
   * Establishes SFTP connection for a user
   */
  private static async connectToSftp(userId: string): Promise<SftpConnection> {
    return new Promise((resolve, reject) => {
      const user = await storage.getUser(userId);
      if (!user || !user.sftpUsername || !user.sftpPassword) {
        reject(new Error('SFTP credentials not found for user'));
        return;
      }

      const client = new Client();
      
      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ client, sftp });
        });
      });

      client.on('error', (err) => {
        reject(err);
      });

      client.connect({
        host: this.SFTP_HOST,
        port: this.SFTP_PORT,
        username: user.sftpUsername,
        password: user.sftpPassword,
        readyTimeout: 10000,
        keepaliveInterval: 10000,
      });
    });
  }

  /**
   * Lists files in a directory
   */
  static async listFiles(userId: string, path: string = '/'): Promise<SftpFileInfo[]> {
    const connection = await this.connectToSftp(userId);
    
    return new Promise((resolve, reject) => {
      connection.sftp.readdir(path, (err, list) => {
        connection.client.end();
        
        if (err) {
          reject(err);
          return;
        }

        const files: SftpFileInfo[] = list.map((item: any) => ({
          name: item.filename,
          type: item.attrs.isDirectory() ? 'directory' : 'file',
          size: item.attrs.size,
          modified: new Date(item.attrs.mtime * 1000),
          permissions: item.attrs.mode.toString(8)
        }));

        resolve(files);
      });
    });
  }

  /**
   * Uploads a file to SFTP server
   */
  static async uploadFile(userId: string, localPath: string, remotePath: string): Promise<void> {
    const connection = await this.connectToSftp(userId);
    
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(localPath);
      const writeStream = connection.sftp.createWriteStream(remotePath);
      
      pipelineAsync(readStream, writeStream)
        .then(() => {
          connection.client.end();
          resolve();
        })
        .catch((err) => {
          connection.client.end();
          reject(err);
        });
    });
  }

  /**
   * Downloads a file from SFTP server
   */
  static async downloadFile(userId: string, remotePath: string, localPath: string): Promise<void> {
    const connection = await this.connectToSftp(userId);
    
    return new Promise((resolve, reject) => {
      const readStream = connection.sftp.createReadStream(remotePath);
      const writeStream = createWriteStream(localPath);
      
      pipelineAsync(readStream, writeStream)
        .then(() => {
          connection.client.end();
          resolve();
        })
        .catch((err) => {
          connection.client.end();
          reject(err);
        });
    });
  }

  /**
   * Creates a directory on SFTP server
   */
  static async createDirectory(userId: string, path: string): Promise<void> {
    const connection = await this.connectToSftp(userId);
    
    return new Promise((resolve, reject) => {
      connection.sftp.mkdir(path, (err) => {
        connection.client.end();
        
        if (err) {
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  }

  /**
   * Deletes a file from SFTP server
   */
  static async deleteFile(userId: string, path: string): Promise<void> {
    const connection = await this.connectToSftp(userId);
    
    return new Promise((resolve, reject) => {
      connection.sftp.unlink(path, (err) => {
        connection.client.end();
        
        if (err) {
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  }

  /**
   * Checks if a file exists on SFTP server
   */
  static async fileExists(userId: string, path: string): Promise<boolean> {
    const connection = await this.connectToSftp(userId);
    
    return new Promise((resolve, reject) => {
      connection.sftp.stat(path, (err) => {
        connection.client.end();
        
        if (err) {
          resolve(false);
          return;
        }
        
        resolve(true);
      });
    });
  }

  /**
   * Gets file information from SFTP server
   */
  static async getFileInfo(userId: string, path: string): Promise<SftpFileInfo | null> {
    const connection = await this.connectToSftp(userId);
    
    return new Promise((resolve, reject) => {
      connection.sftp.stat(path, (err, stats) => {
        connection.client.end();
        
        if (err) {
          resolve(null);
          return;
        }

        const pathParts = path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        
        resolve({
          name: fileName,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: new Date(stats.mtime * 1000),
          permissions: stats.mode.toString(8)
        });
      });
    });
  }
}