# Git Hooks

로컬에서만 동작하는 Git 훅 모음. 실제 훅 파일은 `.git/hooks/`에 위치해야 하지만 이 디렉터리는 git이 관리하지 않으므로, 팀원 각자가 아래 스크립트로 설치해야 합니다.

## 설치

```bash
bash scripts/git-hooks/install.sh
```

기존 훅이 있으면 `.bak`으로 백업 후 덮어씁니다.

## 제공 훅

### pre-push

`main` 브랜치를 push할 때 `develop`에 main으로 머지되지 않은 커밋이 있는지 검사합니다. 누락 커밋이 있으면 목록을 보여주고 `y/N` 프롬프트로 계속 진행할지 묻습니다.

- 2026-04-08 develop 커밋 3건이 main에 머지되지 않은 채 main 빌드가 돌아 앱에 반영이 안 되는 사고가 있었고, 이를 방지하려고 추가했습니다.
- 평상시 `develop`에서 작업하고 머지 후 main push하는 흐름을 가정합니다.

## 우회

긴급 hotfix 등으로 훅을 건너뛸 때:

```bash
git push --no-verify
```

## 주의

- 훅은 **로컬** 설정입니다. 저장소 clone만으로는 적용되지 않으므로 각자 `install.sh`를 실행해야 합니다.
- 새 훅을 추가하면 `install.sh`에 `install_hook "<name>"` 한 줄을 추가하세요.
