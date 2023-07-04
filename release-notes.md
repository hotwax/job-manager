Latest release notes are maintained on Github only. Refer to below link:
https://github.com/hotwax/job-manager/releases

# Release 2.8.1

## What's Changed
* Fixed: build error TS2532: Object is possibly 'undefined'. by @adityasharma7 in https://github.com/hotwax/job-manager/pull/533


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.8.0...v2.8.1

# Release 2.8.0

## What's Changed
* Updated favicon by @Nidbhagwat in https://github.com/hotwax/job-manager/pull/523
* Fixed: 'now' option for run time not working (#517) by @k2maan in https://github.com/hotwax/job-manager/pull/522

## New Contributors
* @Nidbhagwat made their first contribution in https://github.com/hotwax/job-manager/pull/523

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.7.0...v2.8.0

# Release 2.7.0

## What's Changed
* Fixed: jobs list not updated when cancelling a job from configuration by @adityasharma7 in https://github.com/hotwax/job-manager/pull/503
* Improved: Show toast if shopifyConfig required for the job is missing while scheduling (#502) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/509
* Fixed: Enum name should appear on the job card and job list (#487) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/510

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.6.1...v2.7.0


# Release 2.6.1

## What's Changed
* Fixed: old jobs not listed in more jobs (#476) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/499
* Fixed: issue with scheduling initial load order job by @adityasharma7 in https://github.com/hotwax/job-manager/pull/500


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.6.0...v2.6.1


# Release 2.6.0

## What's Changed
* Fixed: job information disappear after cancelling (#462) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/480
* Improved: Update Pre-Order page for new jobs (#476) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/490
* Fixed: alert header issue by always displaying Run now in header and made the message consistent across app(#85zt2zp30) by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/488

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.5.0...v2.6.0


# Release 2.5.0

## What's Changed
* Implemented: predefined and custom option for selecting job run time (#85zrxc0xf) by @k2maan in https://github.com/hotwax/job-manager/pull/449


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.4.0...v2.5.0

# Release 2.4.0

## What's Changed
* Removed: Payment status job (getPaidTransactionsAndCreateOrderPayment service) from the Job Manager orders page (job-manager/#448) by @SandeepRajput20 in https://github.com/hotwax/job-manager/pull/461
* Implemented: Added option for custom frequency (#457) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/468

## New Contributors
* @SandeepRajput20 made their first contribution in https://github.com/hotwax/job-manager/pull/461

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.3.0...v2.4.0

# Release 2.3.0

## What's Changed
* Added: support to pass shopId to runtime data by @adityasharma7 in https://github.com/hotwax/job-manager/pull/456

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.2.2...v2.3.0

# Release 2.2.2

## What's Changed
* Fixed: more jobs' name not showing on mobile view (#85zrw8eup) by @k2maan in https://github.com/hotwax/job-manager/pull/438


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.2.1...v2.2.2

# Release 2.2.1
## What's Changed
* Fixed: wrong base user when getting shopify config for product store change by @adityasharma7 in https://github.com/hotwax/job-manager/pull/441


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.2.0...v2.2.1

# Release 2.2.0

## What's Changed
* Fixed: redundant copy action (#428) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/436
* Improved: use scheduleService action instead of runServiceNow for Initial load job (#423) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/437


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.1.3...v2.2.0

# Release 2.1.3

## What's Changed
* Fixed: Run now functionality not working for already runnning job (#423) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/425
* Fixed: Temporal expression for the new scheduled jobs does not appear properly  (#424) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/426


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.1.2...v2.1.3

# Release 2.1.2

## What's Changed
* Fixed: wrong product delete webhook status on products page (#405) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/406

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.1.1...v2.1.2

# Release 2.1.1

## What's Changed
* Fixed: Duplicate batch jobs visible when scheduling a new batch job (#393) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/403
* Fixed unexpected behaviour on performing multiple operations (update and skip) in configuration component one after the other (#85zrnt2um) by @k2maan in https://github.com/hotwax/job-manager/pull/386

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.1.0...v2.1.1

# Release 2.1.0

## What's Changed
* Added support to subscribe to INVENTORY_LEVEL_UPDATE webhook (#85zrmekh7) by @k2maan in https://github.com/hotwax/job-manager/pull/372
* Fixed: Save button while creating a batch for broker order service does not work (#373) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/375
* Fixed: search jobs modal showing 'no jobs found' without searching any job (#85zrmar8z) by @k2maan in https://github.com/hotwax/job-manager/pull/364
* Implemented: support for using api and client methods from OMS api package (#85zrm1ktj) by @k2maan in https://github.com/hotwax/job-manager/pull/374
* Fixed: Last run doesn't shows previous occurrences for jobs of Initial load page (#303) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/376
* Fixed: issue of webhook not working after successful subscription(#85zrpqhmn) by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/395
* Fixed: navigation to login failed for token expire (oms-api#61) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/396


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v2.0.0...v2.1.0

# Release 2.0.0

## What's Changed
* Implemented logger using vue logger plugin(#21uxamh) by @disha1202 in https://github.com/hotwax/job-manager/pull/357
* Implemented: feature for user authorisation (#2ebg32y) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/188
* Refactored: code for timezone modal and update luxon to 3.2 (#85zrkd35y) by @k2maan in https://github.com/hotwax/job-manager/pull/359
* Fixed: JobConfiguration component displaying runtime of draft jobs(#85zrjdd3b) by @disha1202 in https://github.com/hotwax/job-manager/pull/362 and @shashwatbangar in https://github.com/hotwax/job-manager/pull/353


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.6.0...v2.0.0

# Release 1.6.0
## What's Changed
* Implemented: Code to show app version & build information on Settings page(#85zrhn8w8) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/341
* Added apps-theme package(#31nm26y) by @disha1202 in https://github.com/hotwax/job-manager/pull/345
* Implemented: Added cancelScheduledJob service to cancel job(#85zrh3hjv) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/338
* Implement bulk scheduling (#32j3gu0) by @k2maan in https://github.com/hotwax/job-manager/pull/314
* Fixed: issue of having a special character in response when sending a single property in fieldList array by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/354


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.5.0...v1.6.0

# Release 1.5.1

## What's Changed
* Fixed: issue of having a special character in response when sending a single property in fieldList array by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/354 (backported)


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.5.0...v1.5.1

# Release 1.5.0

## What's Changed
* Improved Menu footer by providing option to change shopifyConfig. (#85zrgqc2a) by @k2maan in https://github.com/hotwax/job-manager/pull/324
* Implemented: Added missing webhook service endpoints(#85zrgg8kw) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/317
* Implemented: Used HTTP get method for all the API calls to fetch data(#85zrh15tj) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/336


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.4.0...v1.5.0

# Release 1.4.0

## What's Changed
* Added shop selector to menu footer (#2a7ymj3) by @k2maan in https://github.com/hotwax/job-manager/pull/283, @Mayank909 in https://github.com/hotwax/job-manager/pull/135, and @disha1202 in https://github.com/hotwax/job-manager/pull/243
* Fixed jobs not appearing after store change from Menu footer (#2a7ymj3) by @k2maan in https://github.com/hotwax/job-manager/pull/310
* Implemented: Updated UI of settings page(#32j3r6t) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/309
* Fixed: issue of brokering filter not working by updating the enumTypeId for brokering jobs(#85zrgnpuc) by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/320
* Fixed: Jobs getting scheduled multiple times(#32qywdd) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/315
* Fixed: build issue due to eslint version mismatch in dependencies(#85zrh0bwu) by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/327


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.3.0...v1.4.0

# Release 1.3.0
## What's Changed
* Implemented: Functionality to fetch more jobs on all pages(#2vjxdha)  by @shashwatbangar in https://github.com/hotwax/job-manager/pull/274
* Added support to alias specific instance URL with environment configuration(#30dkjp1) by @disha1202 in https://github.com/hotwax/job-manager/pull/280
* Bump axios from 0.21.1 to 0.21.4 by @dependabot in https://github.com/hotwax/job-manager/pull/287
* Fixed: Jobs repeatation in moreJobs sections on all pages(#2vjxdha) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/296
* Fixed: Title show in jobConfiguration component (#2vjxdha) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/297
* Fixed: Job runtime not set on jobConfiguration page in case of moreJobs(#2vjxdha) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/299
* Fixed: Removed PO reallocation job from UI(#32129kj) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/301
* Fixed: Jobs list do not reset on Miscellaneous page(#31v8g4k) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/300

## New Contributors
* @dependabot made their first contribution in https://github.com/hotwax/job-manager/pull/287

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.2.0...v1.3.0


# Release 1.2.0
## What's Changed
* Implemented: filters on pipeline page (#2uw73h5) by @k2maan in https://github.com/hotwax/job-manager/pull/246 and @shashwatbangar in https://github.com/hotwax/job-manager/pull/272
* Feature: Add confirmation buttons to date pickers by @franciscoemanuel in https://github.com/hotwax/job-manager/pull/256 and @k2maan in https://github.com/hotwax/job-manager/pull/269
* Fixed build fail by removing 'show-default-buttons = true' error in InititalJobConfiguration and JobConfiguration (#2zb7dhk) by @k2maan in https://github.com/hotwax/job-manager/pull/277
* Upgraded Ionic to 6.2(#2w9wz26) by @disha1202 in https://github.com/hotwax/job-manager/pull/273
* Implemented filter icon color update based on the type of filters applied and the segment selected (#2zb6ver) by @k2maan in https://github.com/hotwax/job-manager/pull/278

## New Contributors
* @franciscoemanuel made their first contribution in https://github.com/hotwax/job-manager/pull/256

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.1.0...v1.2.0
# Release 1.1.0
## What's Changed
* Updated logic to fetch shopify config using fallback api for backward compatibility(#2r65b1c) by @disha1202 in https://github.com/hotwax/job-manager/pull/234
* Fixed: shop should be honored while fetching jobs (#2te9p7v) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/236
* Improved: shop grp to be initially from 1 sequence and simlified query (#2te9p7v) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/237
* Improved: Code to display message on miscellaneous page when no jobs found(#364ttxy) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/235
* Improved: Add a message on miscellaneous page when no jobs found(#2t2wdhn) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/239
* Fixed: error in console due to empty shopify configuration on logout(#2tky1f3) by @disha1202 in https://github.com/hotwax/job-manager/pull/238
* Implemented static UI for bulk editors page(#2vjxd96) by @disha1202 in https://github.com/hotwax/job-manager/pull/244
* Refactored: setEcomStore and setShopifyConfig actions to accept ID. (#2tzh44d) by @k2maan in https://github.com/hotwax/job-manager/pull/241
* Implemented: Validation to set only future date and time on setting runtime. (#2tzb5w4) by @k2maan in https://github.com/hotwax/job-manager/pull/240
* Upgraded version of ionic to 6.1.15(#2uaz29u) by @disha1202 in https://github.com/hotwax/job-manager/pull/248
* Fixed: used console.error instead of console.log  by @divyanshugour in https://github.com/hotwax/job-manager/pull/252
* Implemented: Validation to set only future date and time on setting job runtime. (#2tzb5w4) by @k2maan in https://github.com/hotwax/job-manager/pull/255
* Fixed: runTime being set to current time while setting/updating time (#266) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/267
* Refactored: removed extra API call when setting the same timezone again from the settings page. (#2yma7df) by @k2maan in https://github.com/hotwax/job-manager/pull/265

## New Contributors
* @k2maan made their first contribution in https://github.com/hotwax/job-manager/pull/241
* @divyanshugour made their first contribution in https://github.com/hotwax/job-manager/pull/252

**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.0.11...v1.1.0

# Release 1.0.11

## What's Changed
* Jobs should be fetched and scheduled based upon the selected Shop(#2r65b1c) by @disha1202 in https://github.com/hotwax/job-manager/pull/228
* Added shopify config info at menu footer(#2q9mut9) by @disha1202 in https://github.com/hotwax/job-manager/pull/220
* Implemented: Miscellaneous page in job-manager(#364ttxy) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/214


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.0.10...v1.0.11


# Release 1.0.10

## What's Changed
* Implemented functionality to save auto cancel days(#2cxr1cx) by @rathoreprashant in https://github.com/hotwax/job-manager/pull/213 & @disha1202 in https://github.com/hotwax/job-manager/pull/218
* Fixed: the issue of service time being passed when using run now functionality for pending jobs(#2r0jq44) by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/222
* Fixed: missing productStoreId and shopifyConfigId for Job while using runNow (#2r0jq44) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/223
* Update contribution guideline in Readme file(#2r0kmb3) by @azkyakhan in https://github.com/hotwax/job-manager/pull/224
* Fixed: code to get 'eComStores' in 'getProfile' action instead of calling 'getEcomStores' action (#257v6ck). by @meet-aniket in https://github.com/hotwax/job-manager/pull/165, @rathoreprashant in https://github.com/hotwax/job-manager/pull/200 & @disha1202 in https://github.com/hotwax/job-manager/pull/226
* Implemented: Code to check if user has permission to access the app(#2hr41aq) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/221
* Improved: runTime set to start of the next day for 'EVERYDAY' frequency (#2ftb2vw)  by @rathoreprashant in https://github.com/hotwax/job-manager/pull/206 & @disha1202 in https://github.com/hotwax/job-manager/pull/225
* Implemented: Add additional job actions to job config component(#364tt29) by @disha1202 in https://github.com/hotwax/job-manager/pull/216
* Implemented: additional job actions, to job config component (#364tt29) by @rathoreprashant in https://github.com/hotwax/job-manager/pull/212
* Fixed: Run now functionality for the job manager is not working correctly (#2rhqqf7) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/229
* Implemented: functionality to have option to run jobs within 1 min(#2rhruw9) by @ymaheshwari1 in https://github.com/hotwax/job-manager/pull/230
* Fixed: Not able to open job update section on Pipeline page for some jobs (#2rht6hk) by @adityasharma7 in https://github.com/hotwax/job-manager/pull/231


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.0.9...v1.0.10


# Release 1.0.9

## What's Changed
* Fixed: DateTime component has different hour cycle on different devices(#2dmq8ja) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/180
* Implemented: Feature to run scheduled job right away(#364ttgf) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/211
* Implemented support to store user preference for selected product store (#2f2h8hu) by @shashwatbangar in https://github.com/hotwax/job-manager/pull/219
* Implemented support to store user preference for selected product store (#2f2h8hu) by @rathoreprashant in https://github.com/hotwax/job-manager/pull/197
* Implemented: Add option to select shopify config from settings page(#2q9mut9) by @disha1202 in https://github.com/hotwax/job-manager/pull/217


**Full Changelog**: https://github.com/hotwax/job-manager/compare/v1.0.8...v1.0.9

# Release 1.0.8

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
