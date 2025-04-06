# Kintone API Plugin Uploader

A command-line tool to upload and manage Kintone plugins using the Kintone REST API.

## Features

- Upload Kintone plugins via REST API.
- Automatically update existing plugins or install new ones.
- Supports environment variables for credentials and proxy settings.

## Installation

```bash
npm install -g @ogrtk/kintone-api-plugin-uploader
```

## Usage

```bash
kintone-api-plugin-uploader -f <plugin-file-path> [-d <subdomain>] [-u <username>] [-p <password>] [-i <plugin-id-file-path>] [-x <proxy-url>]
```

### Required Options:

- `-f, --file` (required): Path to the plugin file to be uploaded.

### Optional Options:

- `-d, --subdomain`: Kintone subdomain. If not provided, it defaults to the `KINTONE_SUBDOMAIN` environment variable.
- `-u, --username`: Kintone username with administrative privileges. If not provided, it defaults to the `KINTONE_USERNAME` environment variable.
- `-p, --password`: Kintone password. If not provided, it defaults to the `KINTONE_PASSWORD` environment variable.
- `-i, --idfile`: Path to the plugin ID file. Defaults to `pluginId.txt`.
- `-x, --proxy`: Proxy URL. If not provided, it defaults to the `KINTONE_PROXY` environment variable.

## Example Command

```bash
kintone-api-plugin-uploader -f ./plugins/sample-plugin.zip -d my-subdomain -u admin -p mypassword -i ./pluginId.txt
```

## Environment Variables

Alternatively, you can set the following environment variables:

```bash
export KINTONE_SUBDOMAIN="https://my-subdomain.cybozu.com"
export KINTONE_USERNAME="admin"
export KINTONE_PASSWORD="mypassword"
export KINTONE_PROXY="http://proxy.example.com:8080"
```

## How It Works

1. The tool uploads the specified plugin file to Kintone.
2. It checks for an existing plugin ID in the provided `pluginId.txt` file.
3. If a plugin ID is found, it updates the existing plugin.
4. If no plugin ID is found, it installs the plugin and saves the new plugin ID in `pluginId.txt`.

## Error Handling

If an error occurs during the upload or update process, the tool will log an error message and exit.

## Development Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-repo/kintone-api-plugin-uploader.git
cd kintone-api-plugin-uploader
npm install
```

Build the project:

```bash
npm run build
```

Run tests:

```bash
npm test
```

### Using .local for Environment Variables

`npm test` supports setting environment variables through a `.local` file. A sample file named `.localsample` is included in the repository. You can rename this file to `.local` and edit it to include your credentials:

```
KINTONE_SUBDOMAIN=https://xxxxx.cybozu.com
KINTONE_USERNAME=xxxxx@xxxxx.com
KINTONE_PASSWORD=xxxxx
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

