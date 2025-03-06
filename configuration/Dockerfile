
# TODO Use an image that is most similar to our Packaging build step
FROM public.ecr.aws/amazonlinux/amazonlinux:2023

# Step 1 -> switch to bash for default shell
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Step 2 -> create working directory for nvm
RUN mkdir /usr/local/nvm

# Step 3 -> config working directory for OSD Core
ENV OPENSEARCH_DASHBOARDS_HOME=/home/opensearch-dashboards

# Step 4 -> install required dependencies
RUN yum update -y && yum install -y git gzip shadow-utils tar && yum clean all && yum install -y gettext

# Step 5 -> setup base env for nvm/node installation
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 18.19.0

# Step 6 -> install nvm/node/npm/yarn
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.39.7/install.sh | bash \
    && . ${NVM_DIR}/nvm.sh \
    && nvm install ${NODE_VERSION} \
    && nvm alias default ${NODE_VERSION} \
    && nvm use default \
    && npm install --global yarn

# Step 7 -> setup node path and general path
ENV NODE_PATH ${NVM_DIR}/versions/node/v${NODE_VERSION}/lib/node_modules
ENV PATH      ${NVM_DIR}/versions/node/v${NODE_VERSION}/bin:$PATH

# Step 8 -> install rsync
RUN yum install -y rsync && yum clean all

# Step 9 -> create OSD user and working directory
RUN mkdir ${OPENSEARCH_DASHBOARDS_HOME}
RUN groupadd -r opensearch-dashboards && useradd -r -g opensearch-dashboards opensearch-dashboards
