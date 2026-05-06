# Import monitor

Implementation document for the import monitor page.

## Overview

The import monitor page gives a summary of the two import queues running in the system.
The summary of a queue shows the following details:

1. Queue name (Priority / Standard)
2. Pending files
3. Average speed (files per minute)
4. Total files processed in the last 24 hours

## Queue details

Clicking on a queue card will take the user to the queue details page, which shows the following details:

1. Queue name (Priority / Standard)
2. Pending files
3. Average speed (files per minute)
4. Total files processed in the last 24 hours
5. Option to clear the files in the queue

Each row of the pending file queue shows the following details:

1. Log Id
2. File name
3. File size
4. Upload time
5. Uploaded by
6. Option to discard the file

## Log detail page

Clicking on a log Id will take the user to the log detail page, which shows the following details:

1. File name
2. Log Id
3. File size
4. Upload time
5. Uploaded by
6. Created from Job Name
7. Option to discard the file
8. Total records
9. Failed records
10. Option to download the original and error file
11. Error record details
    1.  Row number
    2.  Row content
    3.  Row error message