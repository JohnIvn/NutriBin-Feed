import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type VideoFramePayload = { id: string; frame: string; [key: string]: any };

type ClassificationPayload = {
  image?: string;
  predictions?: any[];
  ts?: number;
  [key: string]: any;
};

function isVideoFramePayload(obj: unknown): obj is VideoFramePayload {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.frame === 'string';
}

function isClassificationPayload(obj: unknown): obj is ClassificationPayload {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  // basic check: should have predictions array or image field
  return Array.isArray(o.predictions) || typeof o.image === 'string';
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class VideoStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private producers = new Set<string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.emit('stream-status', { active: this.producers.size > 0 });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    if (this.producers.has(client.id)) {
      this.producers.delete(client.id);
      if (this.producers.size === 0) {
        this.server.emit('stream-status', { active: false });
      }
    }
  }

  @SubscribeMessage('video-frame')
  handleVideoFrame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    console.log('VideoStreamGateway handler invoked - DEBUG');
    if (!client || !client.id) {
      console.error('handleVideoFrame: client missing or invalid', client);
      return;
    }
    if (!this.producers.has(client.id)) {
      this.producers.add(client.id);
      this.server.emit('stream-status', { active: true });
    }
    if (!isVideoFramePayload(data)) {
      console.error('Received invalid payload:', data);
      return;
    }

    // Broadcast the original payload (including optional metadata/predictions)
    // We validated required fields with `isVideoFramePayload` above, so it's
    // safe to treat `data` as a VideoFramePayload and forward everything.
    const payload = data as VideoFramePayload;
    this.server.emit('stream', payload);
  }

  @SubscribeMessage('classification')
  handleClassification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ) {
    console.log('Received classification event from', client.id);
    if (!isClassificationPayload(data)) {
      console.error('Invalid classification payload:', data);
      return;
    }
    const payload = data as ClassificationPayload;
    // Broadcast classification payload to all clients
    this.server.emit('classification', payload);
  }
}
