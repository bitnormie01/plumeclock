"""Kokoro TTS for each scene in docs/demo/2026-10-20-demo-script.md section 4.
Writes audio/<id>.wav and audio/<id>.words.json (word start/end in seconds)."""
import json, re, sys
import numpy as np, soundfile as sf
from kokoro import KPipeline

SCRIPT = "../docs/demo/2026-10-20-demo-script.md"
text = open(SCRIPT, encoding="utf-8").read()
scenes = re.findall(r"^\*\*(S\d+)\*\* — (.+)$", text, re.M)
only = set(sys.argv[1:])
pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
SR = 24000
for sid, line in scenes:
    if only and sid not in only:
        continue
    chunks, words, offset = [], [], 0.0
    for r in pipe(line, voice="af_heart", speed=0.92, split_pattern=r"\n+"):
        audio = r.audio.numpy() if hasattr(r.audio, "numpy") else np.asarray(r.audio)
        for t in (r.tokens or []):
            if t.start_ts is None or t.end_ts is None or not t.text.strip():
                continue
            words.append({"text": t.text, "start": offset + t.start_ts, "end": offset + t.end_ts, "ws": t.whitespace})
        chunks.append(audio)
        offset += len(audio) / SR
    wav = np.concatenate(chunks)
    sf.write(f"audio/{sid}.wav", wav, SR)
    json.dump({"id": sid, "duration": len(wav) / SR, "words": words}, open(f"audio/{sid}.words.json", "w"), indent=1)
    print(sid, round(len(wav) / SR, 1), "s", len(words), "tokens")
