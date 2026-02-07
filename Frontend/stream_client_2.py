import cv2
import socketio
import time

# Base URL of your Railway app
SERVER_URL = "https://nutribin-user-backend-production.up.railway.app"
# The specific namespace your NestJS gateway is listening on
NAMESPACE = "/videostream"

# Set logger=True and engineio_logger=True to see connection details in the terminal
sio = socketio.Client(logger=True, engineio_logger=True)

@sio.on('connect', namespace=NAMESPACE)
def on_connect():
    print(f"Connected to server on namespace: {NAMESPACE}")

@sio.on('disconnect', namespace=NAMESPACE)
def on_disconnect():
    print(f"Disconnected from server on namespace: {NAMESPACE}")

@sio.on('connect_error', namespace=NAMESPACE)
def on_connect_error(data):
    print(f"Connection failed: {data}")

def stream_video():
    # Attempt to open the camera (0 is usually the default webcam)
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open video device.")
        return

    print("Starting video stream... Press Ctrl+C to stop.")
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Failed to grab frame.")
                break

            # Optional: Resize frame to reduce bandwidth if needed
            # frame = cv2.resize(frame, (640, 480))

            # Encode frame as JPEG
            _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            
            # Emit to the specific namespace
            sio.emit('video-frame', buffer.tobytes(), namespace=NAMESPACE)

            # Control frame rate (0.05s = ~20 FPS)
            time.sleep(0.05)

    except KeyboardInterrupt:
        print("\nStopping stream...")
    finally:
        cap.release()
        sio.disconnect()

if __name__ == "__main__":
    try:
        # Explicitly connect to the base URL and specify the namespace
        # Railway works best with 'websocket' transport
        sio.connect(SERVER_URL, namespaces=[NAMESPACE], transports=['websocket'])
        stream_video()
    except Exception as e:
        print(f"Failed to connect: {e}")