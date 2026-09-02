#!/usr/bin/env python3
import io
import json
import struct
import sys

MAX_IMAGE_BYTES = 3_000_000
# 800px is enough for kiosk face verify; smaller images decode and encode faster on CPU.
MAX_IMAGE_DIM = 800


def load_face_recognition():
    try:
        import face_recognition  # type: ignore
        return face_recognition, None
    except Exception as exc:
        return None, f"face_recognition import failed: {exc}"


def load_rgb_image(data: bytes):
    import numpy as np
    from PIL import Image

    pil = Image.open(io.BytesIO(data))
    pil = pil.convert("RGB")
    if max(pil.size) > MAX_IMAGE_DIM:
        pil.thumbnail((MAX_IMAGE_DIM, MAX_IMAGE_DIM))
    return np.array(pil)


def embed_image(face_recognition, data: bytes) -> dict:
    if not data:
        return {"error": "empty image bytes"}
    if len(data) > MAX_IMAGE_BYTES:
        return {"error": "image too large"}
    try:
        image = load_rgb_image(data)
        locations = face_recognition.face_locations(image, model="hog")
        if not locations:
            return {"error": "no face detected"}
        encodings = face_recognition.face_encodings(
            image,
            known_face_locations=locations,
            num_jitters=0,
        )
        if not encodings:
            return {"error": "no face detected"}
        return {"embedding": encodings[0].tolist()}
    except Exception as exc:
        return {"error": f"embedding extraction failed: {exc}"}


def write_response(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def run_once() -> int:
    face_recognition, err = load_face_recognition()
    if err:
        write_response({"error": err})
        return 1
    data = sys.stdin.buffer.read()
    result = embed_image(face_recognition, data)
    write_response(result)
    return 0 if "embedding" in result else 1


def run_server() -> int:
    face_recognition, err = load_face_recognition()
    if err:
        write_response({"error": err})
        return 1
    write_response({"ready": True})
    while True:
        header = sys.stdin.buffer.read(4)
        if not header or len(header) < 4:
            break
        length = struct.unpack(">I", header)[0]
        if length == 0 or length > MAX_IMAGE_BYTES:
            write_response({"error": "invalid image length"})
            continue
        data = sys.stdin.buffer.read(length)
        if len(data) < length:
            write_response({"error": "truncated image bytes"})
            break
        write_response(embed_image(face_recognition, data))
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--server":
        raise SystemExit(run_server())
    raise SystemExit(run_once())
