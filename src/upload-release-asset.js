const core = require('@actions/core');
const { GitHub } = require('@actions/github');
const fs = require('fs');
const path = require('path');
const { fromFile } = require('file-type');

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const uploadUrl = core.getInput('upload_url', { required: true });
    const assetPath = core.getInput('asset_dir_path', { required: true });

    // Determine content-length for header to upload asset
    const contentLength = filePath => fs.statSync(filePath).size;

    if (fs.statSync(assetPath).isDirectory()) {
      const assets = fs.readdirSync(assetPath);
      await Promise.all(
        assets.map(async asset => {
          const subAssetPath = path.join(assetPath, asset);
          const fileType = await fromFile(subAssetPath);
          const headers = { 'content-type': fileType.mime, 'content-length': contentLength(assetPath) };
          const uploadAssetResponse = await github.repos.uploadReleaseAsset({
            url: uploadUrl,
            headers,
            name: asset,
            file: subAssetPath
          });
          const {
            data: { browser_download_url: browserDownloadUrl }
          } = uploadAssetResponse;
          return browserDownloadUrl;
        })
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
