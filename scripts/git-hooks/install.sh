#!/usr/bin/env bash
# marzlog git hooks installer
# 사용: bash scripts/git-hooks/install.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
SRC_DIR="$REPO_ROOT/scripts/git-hooks"
DST_DIR="$REPO_ROOT/.git/hooks"

install_hook() {
  local name="$1"
  local src="$SRC_DIR/$name"
  local dst="$DST_DIR/$name"

  if [[ ! -f "$src" ]]; then
    echo "  skip: $src 가 없습니다."
    return
  fi

  if [[ -f "$dst" ]] && ! grep -q "marzlog $name hook" "$dst" 2>/dev/null; then
    echo "  기존 $dst 발견 — 백업: $dst.bak"
    cp "$dst" "$dst.bak"
  fi

  cp "$src" "$dst"
  chmod +x "$dst"
  echo "  ✅ 설치: $dst"
}

echo "marzlog git hooks 설치"
install_hook "pre-push"
echo ""
echo "완료. 우회하려면: git push --no-verify"
