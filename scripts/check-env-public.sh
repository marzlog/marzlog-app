#!/usr/bin/env bash
# .env 는 EAS 빌드 시 업로드된다(.easignore 가 .env 를 제외하지 않음 — EXPO_PUBLIC_* 주입 경로).
# EXPO_PUBLIC_ 로 시작하지 않는 키(서버 비밀값 등)가 섞이면 실패한다. 키 이름만 출력하고 값은 출력하지 않는다.
set -euo pipefail

ENV_FILE="${1:-.env}"
[ -f "$ENV_FILE" ] || exit 0

bad=$(grep -vE '^[[:space:]]*(#|$)' "$ENV_FILE" \
  | sed -E 's/^[[:space:]]*(export[[:space:]]+)?//; s/[[:space:]]*=.*$//' \
  | grep -vE '^EXPO_PUBLIC_' || true)

if [ -n "$bad" ]; then
  echo "check-env-public: $ENV_FILE 에 EXPO_PUBLIC_ 가 아닌 키가 있습니다(EAS 업로드 대상):" >&2
  printf '  %s\n' $bad >&2
  exit 1
fi
