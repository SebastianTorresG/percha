// Cámara en vivo con getUserMedia, marco guía superpuesto y temporizador de 5 s
// (research R-11). Devuelve la foto como JPEG, o null si la usuaria cierra.

export async function abrirCamara(): Promise<Blob | null> {
  const flujo = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1440 } },
    audio: false,
  });

  const capa = document.createElement('div');
  capa.className = 'camara';
  capa.innerHTML = `
    <video playsinline muted autoplay></video>
    <div class="camara-marco" aria-hidden="true"></div>
    <div class="camara-cuenta" aria-live="assertive"></div>
    <div class="camara-botones">
      <button type="button" data-accion="cerrar">Cerrar</button>
      <button type="button" data-accion="disparar" class="principal">Tomar foto</button>
      <button type="button" data-accion="temporizador">5 s</button>
    </div>`;
  document.body.append(capa);

  const video = capa.querySelector('video')!;
  const cuenta = capa.querySelector<HTMLDivElement>('.camara-cuenta')!;
  video.srcObject = flujo;
  await video.play().catch(() => undefined);

  const cerrar = () => {
    for (const pista of flujo.getTracks()) pista.stop();
    capa.remove();
  };

  const capturar = () =>
    new Promise<Blob | null>((resolver) => {
      const lienzo = document.createElement('canvas');
      lienzo.width = video.videoWidth;
      lienzo.height = video.videoHeight;
      lienzo.getContext('2d')!.drawImage(video, 0, 0);
      lienzo.toBlob(resolver, 'image/jpeg', 0.92);
    });

  return new Promise((resolver) => {
    // Si la app pasa a segundo plano, se libera la cámara (iOS la corta de todos modos).
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') terminar(null);
    };
    const terminar = (foto: Blob | null) => {
      document.removeEventListener('visibilitychange', alOcultar);
      cerrar();
      resolver(foto);
    };
    document.addEventListener('visibilitychange', alOcultar);

    capa.addEventListener('click', async (evento) => {
      const accion = (evento.target as HTMLElement).closest('button')?.dataset.accion;
      if (accion === 'cerrar') terminar(null);
      if (accion === 'disparar') terminar(await capturar());
      if (accion === 'temporizador') {
        for (let s = 5; s > 0; s--) {
          cuenta.textContent = String(s);
          await new Promise((r) => setTimeout(r, 1000));
          if (!capa.isConnected) return;
        }
        cuenta.textContent = '';
        terminar(await capturar());
      }
    });
  });
}
