const core = require('@actions/core');
const { GitHub } = require('@actions/github');
const fs = require('fs');
const path = require('path');
const ft = require('file-type');
const util = require('util');

const readFile = util.promisify(fs.readFile);

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const uploadUrl = core.getInput('upload_url', { required: true });
    const assetPath = core.getInput('asset_dir_path', { required: true });

    if (fs.statSync(assetPath).isDirectory()) {
      const assets = fs.readdirSync(assetPath);
      await Promise.all(
        assets.map(async asset => {
          const subAssetPath = path.join(assetPath, asset);
          if (fs.statSync(subAssetPath).isDirectory()) {
            return;
          }
          const buff = readFile(subAssetPath);
          const fileType = await ft.fromBuffer(buff);
          const headers = {
            'content-type': fileType
              ? fileType.mime
              : path.extname(asset)
                ? `application/${path.extname(asset)}`
                : 'text/plain',
            'content-length': buff.length
          };
          await github.repos.uploadReleaseAsset({
            url: uploadUrl,
            headers,
            name: asset,
            file: buff
          });
        })
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
