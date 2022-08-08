
Release 1.0.8

## What's Changed
* Fixed: issue of auto cancel job check is not reflected on UI when the job is scheduled(#28u4g5n) by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/189
* Implemented: Added feature to schedule job that updates ship from dates for pre-order and backorder items on Shopify(#2ftbca6) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/190
* Implemented: functionality to schedule process upload job from initial load page(#2ftaz3n) by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/192
* Implemented: code to add functionality to subscribe or unsubscribe a webhook(#2ftb11u) by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/191
* Implemented | Web hooks card on Product View Page by @rvutd in https://github.com/hotwax/job-manager/pull/178
* Fixed: the issue of null value being passed in payload when scheduling a job(#2hjh89u) by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/195
* Fixed: Instance URL should be case insensitive(#2ft61zw) by @rathoreprashant in https://github.com/hotwax/job-manager/pull/196
* Improved: runTime set to start of the day for 'EVERYDAY' frequency else current time (#2ftb2vw) by @rathoreprashant in https://github.com/hotwax/job-manager/pull/193
* Fixed: lastShopifyOrderId should be required for bulk order import on initial load page (#2krc8dw) by @rathoreprashant in https://github.com/hotwax/job-manager/pull/198
* Updated: code to fetch shopifyConfigId corresponding to product store(#2kbnqzb) by @disha1202 in https://github.com/hotwax/job-manager/pull/199
* Revert "Improved: runTime set to start of the day for 'EVERYDAY' frequency else current time (#2ftb2vw)" by @adityasharma7 in https://github.com/hotwax/job-manager/pull/201
* Fixed: After refreshing and then clicking the back button the user is  redirected to the pipeline page(job-manager(#2deygnv) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/176
* Fixed: Orders are not imported with multiple shopify configuration(#2mky5yp) by @rathoreprashant in https://github.com/hotwax/job-manager/pull/204
* Fixed: Orders are not imported with multiple shopify configuration(#2mky5yp) by @rathoreprashant in https://github.com/hotwax/job-manager/pull/205
* Improved label to "eCom Store" on Settings page (#23tw4yf)  by @rathoreprashant in https://github.com/hotwax/job-manager/pull/203
* Fixed: code to close sliding option for skip action when it completes (#2ebeqzf). by @meet-aniket in https://github.com/hotwax/job-manager/pull/182
* Implemented: code to display a toast when the job is not present (#2fyy5bd) by @rathoreprashant in https://github.com/hotwax/job-manager/pull/202
* Fixed: Removed code which passes entityName for the calls done in findJobs API(#2np1py0) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/208
* Implemented: Added enum description to job config component(#364trwn) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/207
* Fixed: Code to use a single service to subscribe webhook(#2fz59a8) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/194
* Fixed: Issue passing list to performFind with GET method (#2a2ancm) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/185

## New Contributors
* @rvutd made their first contribution in https://github.com/hotwax/job-manager/pull/178

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.0.7...v1.0.8
