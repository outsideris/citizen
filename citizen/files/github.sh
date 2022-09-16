#!/bin/bash
set -eou pipefail

function version_le() {
  # shellcheck disable=SC2053
  [[ "$(echo -e "$1\n$2"  | sort -Vr | head -n 1)" == ${2} ]]
}

function checkCommand() {
  git diff --quiet "${crnt}" "${prev}" -- .
}

function populateToCitizen() {
  # citizen module <namespace> <name> <provider> <version>
  # shellcheck disable=SC2046
  /usr/local/bin/citizen module \
    $(jq -r .namespace version.json) \
    $(jq -r .name version.json) \
    $(jq -r .provider version.json) \
    $(jq -r .version version.json)
}

function check() {
  [[ -f "citizen.version" ]] && version_le "$(jq .version version.json)" "$(cat citizen.version)"
}

# for testing
#MODE="GitHub"
#CITIZEN_GITHUB_TOKEN=""
#CITIZEN_GITHUB_REPO="github.com/atypon/terraform-gcp.git"
#CITIZEN_GITHUB_MODULES_PATH="modules"
#CITIZEN_GITHUB_REPO_INTERNAL_ROOT_PATH="/tmp"

# TODO : support providers and add gpg key
echo "[!] Starting GitHb workflow"
echo "[!] Cloning Repo ..."
mkdir -p "${CITIZEN_GITHUB_REPO_INTERNAL_ROOT_PATH}/repo"
git clone "https://${CITIZEN_GITHUB_TOKEN}@${CITIZEN_GITHUB_REPO}" "${CITIZEN_GITHUB_REPO_INTERNAL_ROOT_PATH}/repo" \
 && cd "${CITIZEN_GITHUB_REPO_INTERNAL_ROOT_PATH}/repo/${CITIZEN_GITHUB_MODULES_PATH}"
echo "[+] Repo Cloned"

prev="$(git rev-parse HEAD)"

set -x
while true
do
  sleep 15

  # || means there was a change
  # && means there wasn't, exit status code = 0
  echo "[!] Checking updates, pulling ..."
  git pull
  crnt="$(git rev-parse HEAD)"
  checkCommand && continue

  for dir in ./*/
  do
    echo "[!] Checking module ${dir}"
    pushd "${dir}"
    checkCommand || {
      {
        # try
        check && {  popd; continue; }
        populateToCitizen && \
        echo "[+] Populated" && \
        jq .version version.json > citizen.version
      } || {
      # catch
        echo "[-] ERROR : FAILED, check logs" ;
        sleep 9999999;
      };
    }
    popd
  done
  prev=$crnt
done

exit 0
