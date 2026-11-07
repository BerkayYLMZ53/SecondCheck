# Third-Party Notices

This file records licenses observed in the installed dependency manifests on 2026-11-07. It is an attribution and review aid, not a replacement for each dependency's own license text, notices, or source distribution obligations.

## Direct runtime dependencies

| Package group | Observed license | Notes |
| --- | --- | --- |
| `@react-native-async-storage/async-storage` | MIT | Package manifest reports MIT. |
| Expo packages: `expo`, `expo-asset`, `expo-audio`, `expo-blur`, `expo-camera`, `expo-clipboard`, `expo-crypto`, `expo-file-system`, `expo-haptics`, `expo-image-manipulator`, `expo-image-picker`, `expo-media-library`, `expo-print`, `expo-sharing`, `expo-speech`, `expo-splash-screen`, `expo-status-bar`, `expo-updates` | MIT | Package manifests report MIT. |
| `lucide-react-native` | ISC | Package manifest reports ISC. Lucide icons are used in the interface. |
| `react`, `react-dom`, `react-native`, `react-native-safe-area-context`, `react-native-svg`, `react-native-web` | MIT | Package manifests report MIT. |

MIT and ISC are permissive licenses and are generally compatible with distribution of an aggregate under AGPLv3, provided their required notices are retained. This does not relicense those dependencies under AGPLv3.

## Development dependencies

The repository also uses TypeScript, ESLint, Expo's ESLint configuration, and React type definitions. Their transitive dependency notices remain governed by the respective packages and lockfile.

## Assets, data, and external services

- `assets/` contains application icons, a profile image, and diagnostic audio. Git history shows one contributor identity, but this is not independent proof of ownership or clearance for every asset.
- `data/devicesCatalog.json` and related catalog/pricing data have no source-attribution or license metadata in the repository. Their origin, update rights, and redistribution terms require maintainer confirmation before a public release.
- Marketplace names and URLs (including Sahibinden and Dolap) and links to third-party services remain subject to their owners' terms and trademarks; they are not licensed by this repository's AGPLv3 grant.
- The project uses Expo services/configuration. Hosted services, deployment accounts, and APIs are separate from this repository's source-license grant.

## Review status

No GPL, LGPL, AGPL, proprietary, or unknown-license **direct npm package** was identified from the installed direct dependency manifests. This is not a complete audit of every transitive dependency or bundled native artifact. Before release, generate and review a complete dependency/SBOM license inventory and retain every required notice.
