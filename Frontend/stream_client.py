import cv2
import socketio
import base64
import time
import sys
import uuid

# Use the root app URL (no custom path) so the Socket.IO client connects to the server's
# Socket.IO endpoint. Change to localhost for local testing: e.g. http://localhost:3000
SERVER_URL = "https://nutribin-feed.up.railway.app"

# Debugging logs are helpful; set to False to quiet output
sio = socketio.Client(logger=True, engineio_logger=False, reconnection=True)


@sio.event
def connect():
    print("Connected to server")


@sio.event
def connect_error(data):
    print("Connection failed:", data)


@sio.event
def disconnect():
    print("Disconnected from server")


def stream_video():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open video device.")
        return

    print("Starting video stream...")

    try:
        while sio.connected:
            ret, frame = cap.read()
            if not ret:
                break

            # Optional: Resize frame to reduce bandwidth
            # frame = cv2.resize(frame, (640, 480))

            # Encode frame as JPEG
            success, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if not success:
                continue

            # Base64-encode the JPEG bytes so it's safe for JSON transport
            jpg_bytes = buffer.tobytes()
            jpg_b64 = base64.b64encode(jpg_bytes).decode('utf-8')

            # Frame id (useful for debugging or ordering)
            frame_id = str(uuid.uuid4())

            payload = {
                'id': frame_id,
                'frame': jpg_b64,
            }

            try:
                sio.emit('video-frame', payload)
            except Exception as e:
                print('Emit failed:', e)
                break

            # Control frame rate (approx 15-20 FPS)
            time.sleep(0.06)

    except KeyboardInterrupt:
        print("Stopping stream...")
    finally:
        cap.release()
        if sio.connected:
            sio.disconnect()


if __name__ == "__main__":
    # Allow passing a custom server URL as the first arg
    if len(sys.argv) > 1:
        SERVER_URL = sys.argv[1]

    try:
        sio.connect(SERVER_URL, transports=['websocket'])
        # Wait until connected (timeout a few seconds)
        timeout = 5.0
        waited = 0.0
        while not sio.connected and waited < timeout:
            time.sleep(0.1)
            waited += 0.1

        if not sio.connected:
            print('Could not connect to server')
            sys.exit(1)

        stream_video()
    except Exception as e:
        print(f"Failed to connect: {e}")
