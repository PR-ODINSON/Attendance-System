import os
import cv2
import numpy as np
import torch
import requests
import pandas as pd
import faiss
import time
import threading
from PIL import Image
from datetime import datetime
from facenet_pytorch import InceptionResnetV1, MTCNN
from sklearn.preprocessing import normalize
from predict import AntiSpoofPredict
from utility import parse_model_name

# ------------------- Configuration -------------------
# base directory for this flaskServer module
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Folder where embeddings are stored (repo-relative)
UPLOADS_FOLDER = os.path.normpath(os.path.join(BASE_DIR, '..', 'backend', 'uploads'))
# Folder for unknown person frames
UNKNOWN_FOLDER = os.path.normpath(os.path.join(BASE_DIR, '..', 'backend', 'Unknown entries'))
API_URL = "http://localhost:3000/api/attendance/mark-attendance"
THRESHOLD = 0.75
# Toggle anti-spoof behavior with a boolean. Can be overridden with the
# environment variable ENABLE_ANTISPOOF=true/1/yes
ENABLE_ANTISPOOF = False
RECONNECT_DELAY = 1.0
GRAB_FLUSH = 4
FRAME_SIZE = (720, 720)
MAX_RETRIES = 5
ATTENDANCE_COOLDOWN = 1 * 60  # 1 minutes in seconds
UNKNOWN_TRACKING_DURATION = 3  # Track unknown person for 3 seconds before saving
# -----------------------------------------------------

# ------------------- Device & Model Setup -------------------
device = 'cuda' if torch.cuda.is_available() else 'cpu'

def get_models():
    """Return a fresh set of models."""
    mtcnn = MTCNN(keep_all=True, device=device)
    resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
    anti_spoof = AntiSpoofPredict(device_id=0)
    return mtcnn, resnet, anti_spoof

# Shared models if CPU (to save memory)
if device == 'cpu':
    mtcnn, resnet, anti_spoof = get_models()
    resnet_lock = threading.Lock()
    antispoof_lock = threading.Lock()
else:
    mtcnn, resnet, anti_spoof = None, None, None
    resnet_lock = antispoof_lock = None

# Anti-spoof model path (repo-relative)
ANTI_SPOOF_MODEL_PATH = os.path.normpath(
    os.path.join(
        BASE_DIR,
        'Silent-Face-Anti-Spoofing',
        'resources',
        'anti_spoof_models',
        '2.7_80x80_MiniFASNetV2.pth',
    )
)

print(ANTI_SPOOF_MODEL_PATH)
# ------------------- Preload Embeddings -------------------
all_embeddings, all_names = [], []
for person_folder in os.listdir(UPLOADS_FOLDER):
    full_path = os.path.join(UPLOADS_FOLDER, person_folder)
    csv_path = os.path.join(full_path, 'embeddings.csv')
    if not os.path.exists(csv_path):
        continue

    df = pd.read_csv(csv_path, header=None)
    for _, row in df.iterrows():
        known_embedding = row.values.astype(float)
        known_embedding = normalize([known_embedding])[0]
        all_embeddings.append(known_embedding)
        all_names.append(person_folder)

# Build FAISS index
if all_embeddings:
    d = len(all_embeddings[0])
    index = faiss.IndexFlatIP(d)
    all_embeddings = np.array(all_embeddings).astype('float32')
    index.add(all_embeddings)
else:
    index = None

# Create Unknown entries folder if it doesn't exist
os.makedirs(UNKNOWN_FOLDER, exist_ok=True)

# ------------------- Functions -------------------
def detect_and_encode(image, mtcnn_local, resnet_local, lock=None):
    with torch.no_grad():
        boxes, _ = mtcnn_local.detect(image)
    if boxes is not None:
        embeddings = []
        for box in boxes:
            x1, y1, x2, y2 = map(int, box)
            face = image[y1:y2, x1:x2]
            if face.size == 0:
                continue
            face = cv2.resize(face, (160, 160))
            face = np.transpose(face, (2, 0, 1)).astype(np.float32) / 255.0
            face_tensor = torch.tensor(face).unsqueeze(0).to(device)
            with torch.no_grad():
                if lock:
                    with lock:
                        encoding = resnet_local(face_tensor).cpu().detach().numpy().flatten()
                else:
                    encoding = resnet_local(face_tensor).cpu().detach().numpy().flatten()
            embedding = normalize([encoding])[0]
            embeddings.append((embedding, box))
        return embeddings
    return []

def match_embedding(input_embedding):
    if index is None:
        return "Unknown", 0.0
    input_embedding = np.array(input_embedding).astype('float32').reshape(1, -1)
    similarity, idx = index.search(input_embedding, 1)
    if similarity[0][0] >= THRESHOLD:
        return all_names[idx[0][0]], similarity[0][0]
    return "Unknown", similarity[0][0]

def determine_action_type(camera_type):
    """Determine action_type based on camera_type and current time."""
    if camera_type == "check_in":
        return "check_in"
    elif camera_type == "check_out":
        return "check_out"
    else:  # camera_type == "auto", use time-based logic
        current_hour = datetime.now().hour
        current_minute = datetime.now().minute
        # Before 12:30 PM = check_in, after = check_out
        if current_hour < 12 or (current_hour == 12 and current_minute < 30):
            return "check_in"
        else:
            return "check_out"

def mark_attendance(name, recognition_time, time_taken_seconds, action_type):
    try:
        response = requests.post(API_URL, json={
            "name": name,
            "action_type": action_type,
            "recognition_time_seconds": time_taken_seconds
        })
        if response.status_code == 200:
            print(f"[API] Marked {action_type} for {name} ({time_taken_seconds:.2f}s)")
            return True
        else:
            print(f"[API] Failed for {name}: {response.status_code}")
    except Exception as e:
        print(f"[API] Error for {name}: {e}")
    return False

def is_real_face(frame, box, anti_spoof_local, lock=None):
    x1, y1, x2, y2 = map(int, box)
    face_img = frame[y1:y2, x1:x2]
    if face_img.size == 0:
        return False
    face_img_resized = cv2.resize(face_img, (80, 80))
    face_img_rgb = cv2.cvtColor(face_img_resized, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(face_img_rgb)
    if lock:
        with lock:
            prediction = anti_spoof_local.predict(pil_image, ANTI_SPOOF_MODEL_PATH)
    else:
        prediction = anti_spoof_local.predict(pil_image, ANTI_SPOOF_MODEL_PATH)
    label = np.argmax(prediction)
    return label == 1

def should_mark(name, marked_dict, camera_type):
    """Check if enough time has passed to re-mark attendance for this (name, camera_type) combination."""
    now = time.time()
    # Use (name, camera_type) as key to allow different actions per camera
    key = (name, camera_type)
    last_time = marked_dict.get(key, 0)
    if now - last_time >= ATTENDANCE_COOLDOWN:
        marked_dict[key] = now
        return True
    return False

def save_unknown_frame(frame, box):
    """Save unknown person frame with timestamp."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"Unknown_{timestamp}.jpg"
    filepath = os.path.join(UNKNOWN_FOLDER, filename)
    
    x1, y1, x2, y2 = map(int, box)
    # Add padding to the face crop
    padding = 50
    h, w = frame.shape[:2]
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)
    
    face_crop = frame[y1:y2, x1:x2]
    cv2.imwrite(filepath, face_crop)
    print(f"[UNKNOWN] Saved unknown person frame: {filename}")
    return filepath

def find_matching_unknown_tracker(embedding, unknown_tracker, similarity_threshold=0.85):
    """Find if this embedding matches any existing tracked unknown person."""
    for tracker_id, data in unknown_tracker.items():
        stored_embedding = data.get('embedding')
        if stored_embedding is not None:
            similarity = np.dot(stored_embedding, embedding)
            if similarity >= similarity_threshold:
                return tracker_id
    return None

# ------------------- Multi-Camera Worker -------------------
class CameraWorker(threading.Thread):
    def __init__(self, source, window_name, marked_dict, stop_event, camera_type="auto"):
        super().__init__(daemon=True)
        self.source = self.normalize_source(source)
        self.window_name = window_name
        self.marked_dict = marked_dict
        self.stop_event = stop_event
        self.camera_type = camera_type
        self.cap = None
        
        # Track unknown persons: tracker_id -> {'first_seen': timestamp, 'last_seen': timestamp, 'saved': bool, 'box': box, 'frame': frame, 'embedding': embedding}
        self.unknown_tracker = {}
        self.next_tracker_id = 0
        self.unknown_similarity_threshold = 0.70  # Lower threshold for tracking same unknown person

        # Per-camera models if GPU, shared if CPU
        if device == 'cuda':
            self.mtcnn, self.resnet, self.anti_spoof = get_models()
            self.resnet_lock = None
            self.antispoof_lock = None
        else:
            self.mtcnn, self.resnet, self.anti_spoof = mtcnn, resnet, anti_spoof
            self.resnet_lock = resnet_lock
            self.antispoof_lock = antispoof_lock

    @staticmethod
    def normalize_source(source):
        """Convert webcam indexes passed as strings into integers for OpenCV."""
        if isinstance(source, str) and source.strip().isdigit():
            return int(source.strip())
        return source

    def find_unknown_tracker(self, embedding):
        """Find existing tracker for this unknown person based on embedding similarity."""
        for tracker_id, data in self.unknown_tracker.items():
            similarity = np.dot(data['embedding'], embedding)
            if similarity >= self.unknown_similarity_threshold:
                return tracker_id
        return None

    def open_stream(self):
        tries = 0
        while tries < MAX_RETRIES:
            if isinstance(self.source, int):
                self.cap = cv2.VideoCapture(self.source, cv2.CAP_DSHOW)
            elif str(self.source).startswith("rtsp://"):
                self.cap = cv2.VideoCapture(f"{self.source}?rtsp_transport=tcp", cv2.CAP_FFMPEG)
            else:
                self.cap = cv2.VideoCapture(self.source)

            if self.cap.isOpened():
                return
            tries += 1
            print(f"[{self.window_name}] Failed to open {self.source}, retry {tries}/{MAX_RETRIES}")
            time.sleep(2)
        print(f"[{self.window_name}] Skipping (cannot open source).")
        self.cap = None

    def run(self):
        print(f"[{self.window_name}] Starting...")
        self.open_stream()
        if self.cap is None:
            return

        while not self.stop_event.is_set():
            for _ in range(GRAB_FLUSH):
                self.cap.grab()
            ret, frame = self.cap.read() if self.cap else (False, None)

            if not ret or frame is None or np.mean(frame) < 10:
                print(f"[{self.window_name}] Invalid/noisy frame. Reconnecting…")
                if self.cap:
                    self.cap.release()
                time.sleep(RECONNECT_DELAY)
                self.open_stream()
                continue

            frame = cv2.resize(frame, FRAME_SIZE)
            start_time = datetime.now()
            current_time = time.time()
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            embeddings_with_boxes = detect_and_encode(rgb_frame, self.mtcnn, self.resnet, self.resnet_lock)
            
            # Track which tracker IDs we saw in this frame
            seen_trackers_this_frame = set()

            for embedding, box in embeddings_with_boxes:
                name, confidence = match_embedding(embedding)
                x1, y1, x2, y2 = map(int, box)

                # Determine spoof status only when antispoofing is enabled.
                is_spoof = False
                if ENABLE_ANTISPOOF:
                    try:
                        is_spoof = not is_real_face(frame, box, self.anti_spoof, self.antispoof_lock)
                    except Exception as e:
                        # If anti-spoof check errors, log and treat as non-spoof to avoid hiding valid recognition
                        print(f"[{self.window_name}] Anti-spoof check error: {e}")
                        is_spoof = False

                # Decide label and color. When spoof is detected we show explicit label; otherwise show recognized name.
                display_name = "Spoof Detected" if is_spoof else name
                color = (0, 165, 255) if is_spoof else ((0, 255, 0) if name != 'Unknown' else (0, 0, 255))

                # Only mark attendance when not spoof and name is known and cooldown passed
                if not is_spoof and name != "Unknown":
                    # If this person was previously tracked as unknown, remove them
                    tracker_id = self.find_unknown_tracker(embedding)
                    if tracker_id is not None:
                        del self.unknown_tracker[tracker_id]
                        print(f"[{self.window_name}] Previously unknown person recognized as {name}")
                    
                    if should_mark(name, self.marked_dict, self.camera_type):
                        recognition_end_time = datetime.now()
                        time_taken_seconds = (recognition_end_time - start_time).total_seconds()
                        action_type = determine_action_type(self.camera_type)
                        if mark_attendance(name, recognition_end_time, time_taken_seconds, action_type):
                            print(f"[{self.window_name}] Attendance updated for {name} ({action_type})")
                
                # Track unknown person regardless of spoof detection (spoof might be false positive)
                if name == "Unknown":
                    # Find or create tracker for this unknown person
                    tracker_id = self.find_unknown_tracker(embedding)
                    
                    if tracker_id is None:
                        # New unknown person
                        tracker_id = self.next_tracker_id
                        self.next_tracker_id += 1
                        self.unknown_tracker[tracker_id] = {
                            'first_seen': current_time,
                            'last_seen': current_time,
                            'saved': False,
                            'box': box,
                            'frame': frame.copy(),
                            'embedding': embedding,
                            'spoof_detected': is_spoof
                        }
                        spoof_status = " (possibly spoof)" if is_spoof else ""
                        print(f"[{self.window_name}] Started tracking unknown person #{tracker_id}{spoof_status}")
                    else:
                        # Update existing tracker
                        self.unknown_tracker[tracker_id]['last_seen'] = current_time
                        self.unknown_tracker[tracker_id]['box'] = box
                        self.unknown_tracker[tracker_id]['spoof_detected'] = is_spoof
                        
                        # Save frame if tracked long enough and not yet saved
                        tracking_duration = current_time - self.unknown_tracker[tracker_id]['first_seen']
                        if not self.unknown_tracker[tracker_id]['saved'] and tracking_duration >= UNKNOWN_TRACKING_DURATION:
                            save_unknown_frame(frame, box)
                            self.unknown_tracker[tracker_id]['saved'] = True
                            print(f"[{self.window_name}] Saved unknown person #{tracker_id} after {tracking_duration:.1f}s")
                    
                    seen_trackers_this_frame.add(tracker_id)

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"{display_name} ({confidence:.2f})", (x1, max(20, y1 - 10)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

            # Clean up unknown tracker - remove persons who left frame
            to_remove = []
            for tracker_id, data in self.unknown_tracker.items():
                # If not seen in this frame
                if tracker_id not in seen_trackers_this_frame:
                    # Remove from tracker if they've been gone for more than 2 seconds
                    if current_time - data['last_seen'] > 2:
                        to_remove.append(tracker_id)
            
            for tracker_id in to_remove:
                del self.unknown_tracker[tracker_id]

            cv2.imshow(self.window_name, frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                self.stop_event.set()
                break

        if self.cap:
            self.cap.release()
        cv2.destroyWindow(self.window_name)
        print(f"[{self.window_name}] Stopped.")

# ------------------- Main -------------------
if __name__ == "__main__":
    # Configure camera streams: (source, camera_type)
    # camera_type: "check_in" (entrance), "check_out" (exit), or "auto" (time-based)
    sources = [
        ("rtsp://admin:InSolare@2025@192.168.1.3:554/stream1", "check_in"), # Stream 1: Entry
        ("rtsp://admin:InSolare@2025@192.168.1.2:554/stream1", "check_out") # Stream 2: Exit
    ]

    marked_dict = {}  # (name, camera_type) -> last timestamp
    stop_event = threading.Event()
    workers = []

    for i, (src, cam_type) in enumerate(sources, start=1):
        window_name = f"Camera {i}"
        worker = CameraWorker(src, window_name, marked_dict, stop_event, camera_type=cam_type)
        worker.start()
        workers.append(worker)

    print("Running multi-camera inference. Press 'q' in any window to quit.")

    try:
        while not stop_event.is_set():
            if cv2.waitKey(10) & 0xFF == ord('q'):
                stop_event.set()
                break
            time.sleep(0.05)
    finally:
        stop_event.set()
        for w in workers:
            w.join()
        cv2.destroyAllWindows()
        print("All camera streams stopped.")
