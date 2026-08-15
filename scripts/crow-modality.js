// ── Crow modality layer ────────────────────────────────────────────────
// Injected into the generated Crow-GodMod3 app by scripts/build-crow-static.mjs.
// Adds a modality switcher (text / image / audio / video, in and out) that
// routes non-text work through the selected local runtime's OpenAI-compatible
// tool endpoints. The Crow Free AI Gateway (127.0.0.1:8766) exposes chat,
// image generation, text-to-speech, and transcription routes on loopback.
//
// This file is injected verbatim into a <script> block: it must not contain
// a closing script-tag string. It runs in the same scope as the main app
// script and may reference its globals (state, saveState, render, …).

    const CROW_MODALITIES = Object.freeze([
      { id: 'text',      label: 'TEXT',  icon: '✎', dir: 'IN · OUT', sticky: true,
        desc: 'Chat with the selected provider and model' },
      { id: 'image-out', label: 'IMAGE', icon: '▣', dir: 'OUT', sticky: true, capability: 'image',
        desc: 'Prompt becomes a generated image' },
      { id: 'image-in',  label: 'IMAGE', icon: '▨', dir: 'IN',  sticky: false,
        desc: 'Attach an image for vision chat' },
      { id: 'audio-out', label: 'AUDIO', icon: '♪', dir: 'OUT', sticky: true, capability: 'tts',
        desc: 'Text becomes spoken audio' },
      { id: 'audio-in',  label: 'AUDIO', icon: '◉', dir: 'IN',  sticky: false, capability: 'asr',
        desc: 'Microphone becomes transcribed text' },
      { id: 'video',     label: 'VIDEO', icon: '▸', dir: 'OUT', sticky: true, capability: 'video',
        desc: 'No video route exists yet' },
    ]);

    // Deterministic route knowledge for Crow's own gateway, so the modality
    // tools work even before a Test & Discover run has cached capabilities.
    const CROW_GATEWAY_KNOWN_ROUTES = Object.freeze({
      crowfree: Object.freeze({
        image: 'miaoxue-image:default',
        tts: 'miaoxue-tts:default',
        asr: 'iflytek-asr:default',
      }),
    });

    let _crowModality = 'text';
    let _crowMediaRecorder = null;
    let _crowRecordedChunks = [];

    function getCrowModalityDef(id) {
      return CROW_MODALITIES.find(m => m.id === id) || CROW_MODALITIES[0];
    }

    function crowModalityTransport() {
      const runtimeId = normalizeLocalRuntime(state.localRuntime, state.localBaseUrl);
      const profile = getLocalRuntimeProfile(runtimeId);
      let baseUrl = '';
      try {
        baseUrl = normalizeLocalBaseUrl(
          profile.baseUrl || LOCAL_RUNTIME_PRESETS[runtimeId].baseUrl || '',
          runtimeId,
        );
      } catch (_) {
        baseUrl = '';
      }
      const apiKey = (_localApiKeysByRuntime[runtimeId]
        ?? (runtimeId === state.localRuntime ? state.localApiKey : '')) || '';
      return { runtimeId, baseUrl, apiKey };
    }

    function crowModalityRouteFor(capability) {
      const { runtimeId } = crowModalityTransport();
      if (typeof findLocalModelWithCapability === 'function') {
        const discovered = findLocalModelWithCapability(runtimeId, capability);
        if (discovered) return discovered;
      }
      return CROW_GATEWAY_KNOWN_ROUTES[runtimeId]?.[capability] || '';
    }

    function crowModalityAvailable(modalityDef) {
      if (!modalityDef.capability) return true;
      return !!crowModalityRouteFor(modalityDef.capability);
    }

    function renderModalityOptions() {
      const dropdown = document.getElementById('modalityDropdown');
      if (!dropdown) return;
      const { runtimeId } = crowModalityTransport();
      const runtimeLabel = LOCAL_RUNTIME_PRESETS[runtimeId]?.label || 'Local';
      dropdown.innerHTML = CROW_MODALITIES.map(m => {
        const active = _crowModality === m.id;
        const available = crowModalityAvailable(m);
        let note = '';
        if (m.capability) {
          const route = crowModalityRouteFor(m.capability);
          note = route
            ? `via ${route} · ${runtimeLabel}`
            : runtimeId === 'crowfree'
              ? 'start the gateway, then Test & Discover'
              : `no route on ${runtimeLabel}`;
        }
        return `
              <div class="modality-option${active ? ' active' : ''}${available ? '' : ' unavailable'}" data-modality="${m.id}" onclick="selectCrowModality('${m.id}')">
                <span class="modality-option-icon">${m.icon}</span>
                <div class="modality-option-info">
                  <div class="modality-option-name">${m.label} <span class="modality-dir-badge">${m.dir}</span></div>
                  <div class="modality-option-desc">${m.desc}</div>
                  ${note ? `<div class="modality-option-route">${escapeHtml(note)}</div>` : ''}
                </div>
                <span class="modality-option-check">✓</span>
              </div>`;
      }).join('');
    }

    function toggleModalityDropdown() {
      if (_crowMediaRecorder) {
        crowStopRecording();
        return;
      }
      const switcher = document.getElementById('modalitySwitcher');
      if (!switcher) return;
      renderModalityOptions();
      switcher.classList.toggle('open');
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('click', (event) => {
        const switcher = document.getElementById('modalitySwitcher');
        if (switcher && !switcher.contains(event.target)) {
          switcher.classList.remove('open');
        }
      });
    }

    function selectCrowModality(id) {
      const def = getCrowModalityDef(id);
      const switcher = document.getElementById('modalitySwitcher');
      if (switcher) switcher.classList.remove('open');

      if (def.capability && !crowModalityAvailable(def)) {
        const { runtimeId } = crowModalityTransport();
        const runtimeLabel = LOCAL_RUNTIME_PRESETS[runtimeId]?.label || 'Local';
        if (typeof logRuntimeDiagnostic === 'function') {
          logRuntimeDiagnostic(
            `${def.label} ${def.dir}: no route on ${runtimeLabel}. Select the Crow Free AI Gateway runtime (or one exposing that capability) and run Test & Discover.`,
            'warning',
          );
        }
        return;
      }

      if (id === 'image-in') {
        document.getElementById('imageFileInput')?.click();
        return;
      }
      if (id === 'audio-in') {
        crowStartRecording();
        return;
      }

      _crowModality = def.sticky ? id : 'text';
      updateCrowModalityUI();
      if (id !== 'text' && typeof logRuntimeDiagnostic === 'function') {
        logRuntimeDiagnostic(`Modality set to ${def.label} ${def.dir} — send uses ${crowModalityRouteFor(def.capability)}`, 'info');
      }
    }

    function updateCrowModalityUI() {
      const def = getCrowModalityDef(_crowModality);
      const label = document.getElementById('modalityLabel');
      const icon = document.getElementById('modalityIcon');
      const dir = document.getElementById('modalityDir');
      const btn = document.getElementById('modalitySwitcherBtn');
      if (label) label.textContent = _crowMediaRecorder ? 'STOP' : def.label;
      if (icon) icon.textContent = def.icon;
      if (dir) dir.textContent = _crowMediaRecorder ? 'REC' : def.dir;
      if (btn) {
        btn.classList.toggle('recording', !!_crowMediaRecorder);
        btn.classList.toggle('non-text', _crowModality !== 'text' || !!_crowMediaRecorder);
        btn.title = _crowMediaRecorder
          ? 'Recording — click to stop and transcribe'
          : `Modality: ${def.label} (${def.dir}) — click to change`;
      }
      const input = document.getElementById('messageInput');
      if (input && !_crowMediaRecorder && !input.dataset.crowBusy) {
        input.placeholder = _crowModality === 'image-out'
          ? 'Describe the image to generate…'
          : _crowModality === 'audio-out'
            ? 'Text to speak aloud…'
            : 'Message...';
      }
      const sendBtn = document.getElementById('sendBtn');
      if (sendBtn) {
        sendBtn.title = _crowModality === 'text'
          ? 'Send'
          : `${def.label} ${def.dir} via ${crowModalityRouteFor(def.capability) || 'no route'}`;
      }
    }

    // Called from sendMessage; returns true when a non-text modality handled
    // the send so the normal chat pipeline should not run.
    async function crowModalityRouteSend(content, attachedImage) {
      if (_crowModality === 'image-out') {
        await crowGenerateImage(content);
        return true;
      }
      if (_crowModality === 'audio-out') {
        await crowSpeakText(content);
        return true;
      }
      return false;
    }

    function crowModalityBeginSend(content) {
      // Mirrors the conversation plumbing at the top of sendMessage().
      if (!state.localEnabled) {
        if (typeof logRuntimeDiagnostic === 'function') {
          logRuntimeDiagnostic('Enable the local runtime in Settings → API Keys first.', 'warning');
        }
        openSettings();
        return null;
      }
      if (!state.currentId) newChat();
      const conv = getCurrentConv();
      const userMsg = { role: 'user', content };
      conv.messages.push(userMsg);
      if (conv.messages.length === 1) {
        conv.title = content.slice(0, 40) + (content.length > 40 ? '...' : '');
      }
      const input = document.getElementById('messageInput');
      input.value = '';
      autoResize(input);
      removeAttachedImage();
      state.promptsTried = (state.promptsTried || 0) + 1;
      updatePromptsTriedUI();
      saveState();
      render();
      isStreaming = true;
      updateSendButton();
      showTyping();
      return conv;
    }

    function crowModalityEndSend() {
      isStreaming = false;
      updateSendButton();
      hideTyping();
      saveState();
      render();
    }

    async function crowModalityFetch(path, body) {
      const { runtimeId, baseUrl, apiKey } = crowModalityTransport();
      if (!baseUrl) throw new Error('The selected local runtime has no base URL.');
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 240);
        throw new Error(`HTTP ${response.status}${detail ? ` — ${detail}` : ''}`);
      }
      return response.json();
    }

    async function crowGenerateImage(prompt) {
      if (!prompt) {
        const input = document.getElementById('messageInput');
        if (input) input.placeholder = 'Describe the image to generate…';
        return;
      }
      const model = crowModalityRouteFor('image');
      const conv = crowModalityBeginSend(`🎨 ${prompt}`);
      if (!conv) return;
      try {
        if (!model) throw new Error('No image-capable route on this runtime. Run Test & Discover or select the Crow Free AI Gateway.');
        logRuntimeDiagnostic(`Generating image via ${model}…`, 'info');
        const data = await crowModalityFetch('/images/generations', { model, prompt });
        const url = data?.data?.[0]?.url || '';
        if (!/^https?:\/\//.test(url)) throw new Error('The runtime returned no image URL.');
        conv.messages.push({
          role: 'assistant',
          content: `Generated image for “${prompt}” via \`${model}\`.`,
          generatedImage: { url, prompt },
        });
        logRuntimeDiagnostic(`Image generated via ${model}`, 'success');
      } catch (err) {
        conv.messages.push({ role: 'assistant', content: `Image generation failed: ${err.message}` });
        if (typeof logRuntimeDiagnostic === 'function') logRuntimeDiagnostic(`Image generation failed: ${err.message}`, 'error');
      } finally {
        crowModalityEndSend();
      }
    }

    async function crowSpeakText(text) {
      if (!text) {
        const input = document.getElementById('messageInput');
        if (input) input.placeholder = 'Text to speak aloud…';
        return;
      }
      const model = crowModalityRouteFor('tts');
      const conv = crowModalityBeginSend(`🔊 ${text}`);
      if (!conv) return;
      try {
        if (!model) throw new Error('No speech-capable route on this runtime. Run Test & Discover or select the Crow Free AI Gateway.');
        logRuntimeDiagnostic(`Generating speech via ${model}…`, 'info');
        const data = await crowModalityFetch('/audio/speech', { model, input: text });
        const url = data?.audio_source || '';
        if (!/^https?:\/\//.test(url)) throw new Error('The runtime returned no audio URL.');
        conv.messages.push({
          role: 'assistant',
          content: `Spoken audio for “${text.slice(0, 120)}${text.length > 120 ? '…' : ''}” via \`${model}\`.`,
          generatedAudio: { url, text },
        });
        logRuntimeDiagnostic(`Speech generated via ${model}`, 'success');
      } catch (err) {
        conv.messages.push({ role: 'assistant', content: `Speech generation failed: ${err.message}` });
        if (typeof logRuntimeDiagnostic === 'function') logRuntimeDiagnostic(`Speech generation failed: ${err.message}`, 'error');
      } finally {
        crowModalityEndSend();
      }
    }

    async function crowStartRecording() {
      if (_crowMediaRecorder) return;
      const route = crowModalityRouteFor('asr');
      if (!route) {
        if (typeof logRuntimeDiagnostic === 'function') {
          logRuntimeDiagnostic('AUDIO IN: no transcription route on this runtime. Select the Crow Free AI Gateway and run Test & Discover.', 'warning');
        }
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        if (typeof logRuntimeDiagnostic === 'function') {
          logRuntimeDiagnostic('AUDIO IN: microphone capture is not available in this browser.', 'error');
        }
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        _crowRecordedChunks = [];
        const recorder = new MediaRecorder(stream);
        _crowMediaRecorder = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data?.size) _crowRecordedChunks.push(event.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
          const blob = new Blob(_crowRecordedChunks, { type: recorder.mimeType || 'audio/webm' });
          _crowMediaRecorder = null;
          _crowRecordedChunks = [];
          updateCrowModalityUI();
          crowTranscribeAndInsert(blob, route);
        };
        recorder.start();
        _crowModality = 'audio-in';
        updateCrowModalityUI();
        if (typeof logRuntimeDiagnostic === 'function') {
          logRuntimeDiagnostic('Recording… click the modality button to stop and transcribe.', 'info');
        }
      } catch (err) {
        _crowMediaRecorder = null;
        updateCrowModalityUI();
        if (typeof logRuntimeDiagnostic === 'function') {
          logRuntimeDiagnostic(`Microphone error: ${err.message}`, 'error');
        }
      }
    }

    function crowStopRecording() {
      if (_crowMediaRecorder) _crowMediaRecorder.stop();
    }

    // Decode browser audio (webm/opus) to 16 kHz mono signed-16-bit PCM,
    // then base64 — the exact frame format the transcription route expects.
    async function crowEncodePcm16Base64(blob) {
      const arrayBuffer = await blob.arrayBuffer();
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) throw new Error('Web Audio is not available in this browser.');
      const audioCtx = new AudioContextCtor();
      try {
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        const mono = decoded.getChannelData(0);
        const ratio = decoded.sampleRate / 16000;
        const outLength = Math.max(1, Math.round(mono.length / ratio));
        const pcm = new Int16Array(outLength);
        for (let i = 0; i < outLength; i++) {
          const sample = mono[Math.min(mono.length - 1, Math.round(i * ratio))];
          pcm[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
        }
        const bytes = new Uint8Array(pcm.buffer);
        let binary = '';
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
        }
        return btoa(binary);
      } finally {
        audioCtx.close();
      }
    }

    async function crowTranscribeAndInsert(blob, route) {
      if (!blob || !blob.size) {
        if (typeof logRuntimeDiagnostic === 'function') logRuntimeDiagnostic('No audio captured.', 'warning');
        _crowModality = 'text';
        updateCrowModalityUI();
        return;
      }
      const input = document.getElementById('messageInput');
      if (input) {
        input.dataset.crowBusy = '1';
        input.placeholder = 'Transcribing…';
      }
      isStreaming = true;
      updateSendButton();
      try {
        const audio = await crowEncodePcm16Base64(blob);
        if (typeof logRuntimeDiagnostic === 'function') logRuntimeDiagnostic(`Transcribing via ${route}…`, 'info');
        const data = await crowModalityFetch('/audio/transcriptions', { model: route, audio });
        const text = String(data?.text || '').trim();
        if (!text) throw new Error('The transcription route returned no text.');
        if (input) {
          input.value = (input.value ? input.value.replace(/\s+$/, '') + ' ' : '') + text;
          autoResize(input);
          input.focus();
        }
        if (typeof logRuntimeDiagnostic === 'function') logRuntimeDiagnostic('Transcription complete — review and send.', 'success');
      } catch (err) {
        if (typeof logRuntimeDiagnostic === 'function') logRuntimeDiagnostic(`Transcription failed: ${err.message}`, 'error');
      } finally {
        isStreaming = false;
        updateSendButton();
        _crowModality = 'text';
        if (input) delete input.dataset.crowBusy;
        updateCrowModalityUI();
      }
    }

    // Render generated media inside assistant messages (called from renderMessages).
    function renderCrowGeneratedMedia(msg) {
      if (!msg || typeof msg !== 'object') return '';
      let out = '';
      const img = msg.generatedImage;
      if (img && /^https?:\/\/[^\s"'<>]+$/.test(img.url || '')) {
        const url = escapeAttr(img.url);
        const caption = escapeAttr(img.prompt || 'generated image');
        out += `<div class="generated-media"><a href="${url}" target="_blank" rel="noopener"><img class="generated-image" src="${url}" loading="lazy" decoding="async" alt="${caption}"></a><div class="generated-media-caption">▣ ${caption} · <a href="${url}" target="_blank" rel="noopener">open full size ↗</a></div></div>`;
      }
      const audio = msg.generatedAudio;
      if (audio && /^https?:\/\/[^\s"'<>]+$/.test(audio.url || '')) {
        const url = escapeAttr(audio.url);
        const caption = escapeAttr((audio.text || 'generated audio').slice(0, 80));
        out += `<div class="generated-media"><audio class="generated-audio" controls preload="none" src="${url}"></audio><div class="generated-media-caption">♪ ${caption}</div></div>`;
      }
      return out;
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateCrowModalityUI);
      } else {
        updateCrowModalityUI();
      }
    }
