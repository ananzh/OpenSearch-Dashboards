
#!/bin/sh
set -e

# Check if STAGE is "prod"
if [ "$STAGE" = "alpha" ]; then
  export VALIDATE_JWT="false"
  export CP_ONLY_DATA_SOURCE_MANAGEMENT="false"
else
  export VALIDATE_JWT="true"
  export CP_ONLY_DATA_SOURCE_MANAGEMENT="true"
fi

# DQS feature flag for Nexus/SpyGlass and saved queries new ui feature flag for Spyglass
export DQS_ENABLED="true"
export SAVED_QUERIES_NEW_UI_ENABLED="true"

# Olly feature flag for re:Invent launch
if [ "$STAGE" = "alpha" ] || [ "$STAGE" = "beta" ] || { [ "$STAGE" = "gamma" ] && [ "$REGION" = "us-west-2" ]; }; then
  export CHAT_ENABLED="true"
  export TEXT2VIZ_ENABLED="true"
  export ALERTINSIGHT_ENABLED="true"
  export SMARTANOMALYDETECTOR_ENABLED="true"
  export ASSISTANT_ENABLED="true"
  export DISCOVER_SUMMARY_ENABLED="true"
  export METRICS_REPORTING_ENABLED="true"
  export SUBSCRIPTION_ENABLED="true"
else
  export CHAT_ENABLED="false"
  export TEXT2VIZ_ENABLED="false"
  export ALERTINSIGHT_ENABLED="false"
  export SMARTANOMALYDETECTOR_ENABLED="false"
  export ASSISTANT_ENABLED="false"
  export DISCOVER_SUMMARY_ENABLED="false"
  export METRICS_REPORTING_ENABLED="false"
  export SUBSCRIPTION_ENABLED="false"
fi


# OpenSearch Flow feature flag
if [ "$STAGE" = "alpha" ] || [ "$STAGE" = "beta" ]; then
  export OPENSEARCHFLOW_ENABLED="true"
else
  export OPENSEARCHFLOW_ENABLED="false"
fi

if [ "$STAGE" = "prod" ]; then
  export CONTROL_PLANE_SPN="svc:opensearchservice.amazonaws.com"
else
  export CONTROL_PLANE_SPN="svc:aosd.aws.internal"
fi

echo "setting environment variable VALIDATE_JWT to ${VALIDATE_JWT}"
echo "setting environment variable DQS_ENABLED to ${DQS_ENABLED}"
echo "setting environment variable CP_ONLY_DATA_SOURCE_MANAGEMENT to ${CP_ONLY_DATA_SOURCE_MANAGEMENT}"
echo "setting environment variable CONTROL_PLANE_SPN to ${CONTROL_PLANE_SPN}"
echo "setting environment variable SAVED_QUERIES_NEW_UI_ENABLED to ${SAVED_QUERIES_NEW_UI_ENABLED}"

# Substitute environment variables in the OpenSearch Dashboards configuration file
envsubst < "${OPENSEARCH_DASHBOARDS_HOME}"/config/opensearch_dashboards.yml.template > "${OPENSEARCH_DASHBOARDS_HOME}"/build/opensearch-dashboards/config/opensearch_dashboards.yml

# Start the OpenSearch Dashboards
"opensearch-dashboards"
