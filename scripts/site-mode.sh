#!/usr/bin/env bash
# Flip the Fibery Site Config "**Production Mode:**" line (live | under-construction).
# Used by the Website->CMS cutover and scripts/cutover-rollback.sh.
set -euo pipefail

MODE="${1:?usage: site-mode.sh live|under-construction}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRET=$(python3 -c "import json; print(json.load(open('$ROOT/tests/cutover-baseline.json'))['site_config_doc_secret'])")

fibery undersight doc "$SECRET" --format md | MODE="$MODE" python3 -c "
import json, os, re, sys
c = json.load(sys.stdin)['content']
c2 = re.sub(r'\*\*Production Mode:\*\* *[A-Za-z-]+', '**Production Mode:** ' + os.environ['MODE'], c)
assert c2 != c or os.environ['MODE'] in c, 'Production Mode line not found'
open('/tmp/site-config-mode.md', 'w').write(c2)
"
fibery undersight doc-write "$SECRET" --content-file /tmp/site-config-mode.md --format md >/dev/null
# read back and assert
fibery undersight doc "$SECRET" --format md | python3 -c "
import json, sys
c = json.load(sys.stdin)['content']
import re; m = re.search(r'\*\*Production Mode:\*\* *([A-Za-z-]+)', c)
print('Production Mode is now:', m.group(1))
assert m.group(1) == '$MODE', 'flip did not stick'
"
