const path = require('path');

jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('fs');
jest.mock('file-type');

const core = require('@actions/core');
const fileType = require('file-type');
const { GitHub, context } = require('@actions/github');
const fs = require('fs');
const run = require('../src/upload-release-asset');

/* eslint-disable no-undef */
describe('Upload Release Asset', () => {
  let uploadReleaseAsset;
  let content;

  beforeEach(() => {
    uploadReleaseAsset = jest.fn().mockReturnValueOnce({
      data: {
        browser_download_url: 'browserDownloadUrl'
      }
    });

    fs.statSync = jest.fn().mockReturnValueOnce({
      size: 527
    });

    fileType.fromFile = jest.fn().mockReturnValueOnce(
      Promise.resolve({
        mime: 'mine'
      })
    );

    content = Buffer.from('test content');
    fs.readFileSync = jest.fn().mockReturnValueOnce(content);

    context.repo = {
      owner: 'owner',
      repo: 'repo'
    };

    const github = {
      repos: {
        uploadReleaseAsset
      }
    };

    GitHub.mockImplementation(() => github);
  });

  test('Upload release asset endpoint is called', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('upload_url')
      .mockReturnValueOnce('build');

    fs.statSync = jest
      .fn()
      .mockReturnValueOnce({
        isDirectory: () => true
      })
      .mockReturnValueOnce({
        isDirectory: () => true
      })
      .mockReturnValueOnce({
        isDirectory: () => false
      })
      .mockReturnValueOnce({
        size: 527
      });

    fs.readdirSync = jest.fn().mockReturnValueOnce(['a', 'b']);

    await run();

    expect(uploadReleaseAsset).toHaveBeenCalledWith({
      url: 'upload_url',
      headers: { 'content-type': 'mine', 'content-length': 527 },
      name: 'b',
      file: path.join('build', 'b')
    });
  });

  test('Action fails elegantly', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('upload_url')
      .mockReturnValueOnce('asset_path')
      .mockReturnValueOnce('asset_name')
      .mockReturnValueOnce('asset_content_type');

    uploadReleaseAsset.mockRestore();
    uploadReleaseAsset.mockImplementation(() => {
      throw new Error('Error uploading release asset');
    });

    core.setOutput = jest.fn();

    core.setFailed = jest.fn();

    await run();

    expect(uploadReleaseAsset).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith('Error uploading release asset');
    expect(core.setOutput).toHaveBeenCalledTimes(0);
  });
});
