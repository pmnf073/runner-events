# App Android (TWA)

A app Android é uma Trusted Web Activity: um APK que abre `https://runner-events.vercel.app/calendar` em ecrã inteiro, com o Chrome do telemóvel. O conteúdo é o próprio site, por isso cada deploy na Vercel atualiza a app sem novo APK. Só é preciso gerar um APK novo quando muda `twa-manifest.json` ou os ícones.

- `twa-manifest.json`: configuração do Bubblewrap (pacote `pt.alvercaurbanrunners.app`, domínio, cores, ícones).
- `.github/workflows/android-apk.yml`: gera o APK (e o `.aab` para a Play Store) no GitHub Actions.
- `frontend/public/manifest.webmanifest`, `frontend/public/sw.js`, `frontend/public/icons/`: a parte PWA do site.
- `/.well-known/assetlinks.json`: gerado no build do frontend a partir das variáveis `TWA_SHA256_FINGERPRINTS` (e opcionalmente `TWA_PACKAGE_NAME`). Sem ele, a app abre com a barra de endereço do Chrome.

O nome do pacote não pode mudar depois de a app estar instalada nos telemóveis (ou publicada na Play Store): uma app com outro pacote é uma app diferente.

## Configurar a chave de assinatura (uma vez)

A chave assina todas as versões. **Guarda o ficheiro e as passwords num sítio seguro**: sem eles não é possível publicar atualizações que instalem por cima da app existente. Não faças commit da chave.

1. No teu computador (precisa de Java), cria a chave com o alias `aur`. Usa uma password só com letras e números (o Bubblewrap passa-a entre aspas na linha de comandos):

   ```bash
   keytool -genkeypair -keystore aur-android.keystore -alias aur -keyalg RSA -keysize 2048 -validity 10000 \
     -dname "CN=Alverca Urban Runners, O=Alverca Urban Runners, C=PT"
   ```

2. No GitHub, em Settings → Secrets and variables → Actions → Secrets, cria:
   - `ANDROID_KEYSTORE_BASE64`: o resultado de `base64 -w0 aur-android.keystore` (no macOS: `base64 -i aur-android.keystore`)
   - `ANDROID_KEYSTORE_PASSWORD` e `ANDROID_KEY_PASSWORD`: as passwords escolhidas (iguais, se só definiste uma).

3. Em Actions → Android APK → Run workflow, corre o workflow. O resumo da execução mostra o **SHA-256 do certificado**.

4. Na Vercel (Settings → Environment Variables, ambiente Production), cria `TWA_SHA256_FINGERPRINTS` com esse valor e faz redeploy. Confirma que `https://runner-events.vercel.app/.well-known/assetlinks.json` responde com o fingerprint.

Se mais tarde publicares na Play Store com "Play App Signing", a Google assina com outra chave: acrescenta o SHA-256 dessa chave (Play Console → Configuração → Integridade da app) a `TWA_SHA256_FINGERPRINTS`, separado por vírgula.

## Publicar uma versão para os sócios

Em Actions → Android APK → Run workflow, marca "Publicar o APK numa GitHub Release". O APK fica numa Release pública do repositório. Os sócios instalam-no no Android depois de permitir "instalar apps desconhecidas" para o browser.

O `versionCode` é o número da execução do workflow, por isso cada APK novo instala por cima do anterior (desde que assinado com a mesma chave).

Sem os secrets, o workflow assina com uma chave de teste descartável: o APK instala, mas abre com a barra de endereço e não pode ser atualizado por um APK oficial (é preciso desinstalar primeiro).
