# CHANGELOG

Inspired from [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [Unreleased]

### 💥 Breaking Changes

### Deprecations

### 🛡 Security

- [CVE-2022-25758] Use dart-sass instead of node-sass ([#2054](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2054))

### 📈 Features/Enhancements

- [Table Visualization] Replace table visualization using React and DataGrid component ([#2863](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2863))

### 🐛 Bug Fixes

- [Vis Builder] Fix empty workspace animation does not work in firefox ([#2853](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2853))

### 🚞 Infrastructure

### 📝 Documentation

- Add the release runbook to RELEASING.md ([#2533](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2533))

### 🛠 Maintenance

- Adding @zhongnansu as maintainer. ([#2590](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2590))

### 🪛 Refactoring

- [Vis Builder] Removed Hard Coded Strings and Used i18n to transalte([#2867](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2867))

### 🔩 Tests

## [2.x]

### 💥 Breaking Changes

### Deprecations

### 🛡 Security

- Use a forced CSP-compliant interpreter with Vega visualizations ([#2352](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2352))
- Bump moment-timezone from 0.5.34 to 0.5.37 ([#2361](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2361))
- [CVE-2022-33987] Upgrade geckodriver to 3.0.2 ([#2166](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2166))
- Bumps percy-agent to use non-beta version ([#2415](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2415))
- Resolve sub-dependent d3-color version and potential security issue ([#2454](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2454))
- [CVE-2022-3517] Bumps minimatch from 3.0.4 to 3.0.5 and [IBM X-Force ID: 220063] unset-value from 1.0.1 to 2.0.1 ([#2640](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2640))
- [CVE-2022-37601] Bump loader-utils to 2.0.3 ([#2689](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2689))

### 📈 Features/Enhancements

- Add updated_at column to objects' tables ([#1218](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/1218))
- [Viz Builder] State validation before dispatching and loading ([#2351](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2351))
- [Viz Builder] Create a new wizard directly on a dashboard ([#2384](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2384))
- [Viz Builder] Edit wizard directly on dashboard ([#2508](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2508))
- [Multi DataSource] UX enhacement on index pattern management stack ([#2505](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2505))
- [Multi DataSource] UX enhancement on Data source management stack ([#2521](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2521))
- [Multi DataSource] UX enhancement on Update stored password modal for Data source management stack ([#2532](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2532))

### 🐛 Bug Fixes

- [Viz Builder] Fixes time series for new chart types ([#2309](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2309))
- [Viz Builder] Add index pattern info when loading embeddable ([#2363](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2363))
- Fixes management app breadcrumb error ([#2344](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2344))
- [BUG] Fix suggestion list cutoff issue ([#2607](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2607))

### 🚞 Infrastructure

- Add path ignore for markdown files for CI ([#2312](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2312))
- Updating WS scans to ignore BWC artifacts in `cypress` ([#2408](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2408))
- [CI] Run functional test repo as workflow ([#2503](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2503))

### 📝 Documentation

- README.md for saving index pattern relationship ([#2276](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2276))
- Remove extra typo from README. ([#2403](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2403))
- Add sample config for multi data source feature in yml template. ([#2428](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2428))
- README.md for dataSource and dataSourceManagement Plugin ([#2448](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2448))
- Updates functionl testing information in Testing.md ([#2492](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2492))

### 🛠 Maintenance

- Increment from 2.3 to 2.4. ([#2295](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2295))
- Adding @zengyan-amazon as maintainer ([#2419](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2419))
- Updating @tmarkley to Emeritus status. ([#2423](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2423))
- Adding sample config for multi data source in yml config template. ([#2428](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2428))
- Adding @kristenTian as maintainer. ([#2450](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2450))

### 🪛 Refactoring

### 🔩 Tests

- Update caniuse to fix failed integration tests ([#2322](https://github.com/opensearch-project/OpenSearch-Dashboards/pull/2322))

[unreleased]: https://github.com/opensearch-project/OpenSearch-Dashboards/compare/2.3.0...HEAD
[2.x]: https://github.com/opensearch-project/OpenSearch-Dashboards/compare/2.3.0...2.x
