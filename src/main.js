import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import detectPlatforms from './detectors.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const staticFolder = path.join(__dirname, '../static')

export default async ({ req, res, log }) => {  
      // // Intercept assetlinks.json request
      if (req.path === '/.well-known/assetlinks.json') {
      //      let assetlinksContent = null;
      // try {
      //     assetlinksContent = readFileSync(path.join(__dirname,'../.well-known/assetlinks.json'), 'utf8');
      // } catch (e) {
      //     console.error(`Error reading assetlinks.json: ${e.message}`);
      //     // Handle error: perhaps set a default empty JSON or let the function fail later if this is critical
      //     assetlinksContent = '[]'; // Fallback to an empty array to prevent parse errors
      // }
      // context.log('INICIO');
      let assetlinksContent = `
      [{
        "relation": ["delegate_permission/common:query_web_app_intent", "delegate_permission/common:handle_all_urls"],
        "target": {
          "namespace": "android_app",
          "package_name": "br.com.lider.mobileapp",
          "sha256_cert_fingerprints": [
            "66:5C:99:40:32:49:90:EB:AE:E0:A9:96:B3:3E:7C:34:3F:99:CB:F3:86:BC:18:F4:AF:92:4C:44:E4:95:B6:59"
          ]
        }
      }]
      `;
    
      // // Ensure it's valid JSON for direct sending
      // let ASSETLINKS_JSON_STRING = assetlinksContent;
      // try {
      //     context.log(`conteudo::::` + assetlinksContent);
      //     // Attempt to parse and then stringify again to ensure it's minified and valid
      //     ASSETLINKS_JSON_STRING = JSON.stringify(JSON.parse(assetlinksContent));
      // } catch (e) {
      //     console.error(`conteudo:::: ${assetlinksContent}`);
      //     console.error(`Error parsing assetlinks.json content: ${e.message}`);
      //     ASSETLINKS_JSON_STRING = `["ff":"dd"]`; // Fallback
      // }
  
    
      return res.send(assetlinksContent, 200, {
          'Content-Type': 'application/json'
      });
  }

  
  const config = JSON.parse(process.env.CONFIG ?? '[]')

  if (config.length === 0) {
    throw new Error('CONFIG environment variable must be set')
  }

  const targets = config.find(({ path }) => path === req.path)?.targets
  if (!targets) {
    log(`No targets for path ${req.path}`)
    return res.empty()
  }
  log(`Found targets for path ${req.path}`)

  const platforms = detectPlatforms(req.headers['user-agent'])
  log(`Detected platforms: ${platforms.join(', ')}`)

  for (const platform of platforms) {
    const target = targets[platform]
    if (!target) {
      log(`No redirect for platform ${platform}`)
      continue
    }

    if (platform === 'default') {
      log(`Default for platform ${platform}`)
      return res.redirect(targets.default)
    }

    if (typeof target === 'string') {
      log(`Simple redirect to ${target}`)
      return res.redirect(target)
    }

    if (typeof target === 'object' && target.appName) {
      log(`Deep link to app=${target.appName} path=${target.appPath}`)

      const template = readFileSync(
        path.join(staticFolder, 'deeplink.html')
      ).toString()

      const html = template
        .split('{{APP_NAME}}')
        .join(target.appName)
        .split('{{APP_PATH}}')
        .join(target.appPath)
        .split('{{APP_PACKAGE}}')
        .join(target.appPackage ?? '')
        .split('{{FALLBACK}}')
        .join(target.fallback ?? targets.default ?? '')

      return res.send(html, 200, {
        'Content-Type': 'text/html; charset=utf-8',
      })
    }
  }

  log(`Out of ideas, returning empty response`)
  return res.empty()
}
