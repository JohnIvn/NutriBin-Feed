import cv2
import socketio
import base64
import time
import sys

# Change this to your Railway app URL
SERVER_URL = "https://nutribin-feed.up.railway.app" # Update this after deployment or for local testing

# Set logger=True and engineio_logger=True to see connection details
sio = socketio.Client(logger=True, engineio_logger=True)

@sio.event
def connect():
    print("Connected to server")

@sio.event
def disconnect():
    print("Disconnected from server")

def stream_video():
    # Attempt to open the camera
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open video device.")
        return

    print("Starting video stream...")
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Optional: Resize frame to reduce bandwidth
            # frame = cv2.resize(frame, (640, 480))

            # Encode frame as JPEG
            _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            
            # Convert to base64 or send as binary
            # Binary is more efficient, but base64 is easier for some web clients
            # Let's use binary (the buffer itself)
            sio.emit('video-frame', buffer.tobytes())

            # Control frame rate (approx 20 FPS)
            time.sleep(0.05)

    except KeyboardInterrupt:
        print("Stopping stream...")
    finally:
        cap.release()
        sio.disconnect()

if __name__ == "__main__":
    try:
        # Explicitly use websocket transport and set namespaces if needed
        # Railway works best with standard HTTPS (443) and websocket transport
        sio.connect(SERVER_URL, transports=['websocket'])
        stream_video()
    except Exception as e:
        print(f"Failed to connect: {e}")
