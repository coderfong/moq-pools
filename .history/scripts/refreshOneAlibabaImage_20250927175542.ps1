# PowerShell helper to refresh a single Alibaba SavedListing image by URL
param(
  [Parameter(Mandatory=$true)][string]$Url
)

$env:TS_NODE_PROJECT = "tsconfig.scripts.json"
node -r ts-node/register -r tsconfig-paths/register scripts/refreshAlibabaImages.ts --only-url=$Url
