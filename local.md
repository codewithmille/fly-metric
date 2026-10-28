Step 1: How to Change the Database Host to 127.0.0.1 in the Cora App
When Cora cannot connect to the database (for example, when you open the app while offline), it will automatically open the "Database Setup" window (the screen containing the Server Mode and Client Mode tabs).

If the app is stuck loading or does not show this screen, close Cora and open it again while offline.

Once you are on the Database Setup screen:

Make sure you are on the Server Mode (Host Database) tab.
In the Host field (which currently says localhost), erase it and type: 127.0.0.1
Leave the other details (Port, Database Name, Username, and Password) exactly as they were.
Click "Save, Create Tables & Start".
From now on, the app will bypass local DNS lookups, ensuring database connectivity remains stable even without internet or network connections.

Step 2: How to Allow PostgreSQL and Node.js through the Windows Firewall
To prevent Windows from blocking the local database connections when network profiles switch (online
→
→ offline):

Press the Windows Key on your keyboard, type "Windows Defender Firewall", and press Enter.
On the left side of the panel, click "Allow an app or feature through Windows Defender Firewall".
Click the "Change settings" button at the top right (you may need Administrator access).
Scroll down the list of apps and features to locate:
Node.js JavaScript Runtime (or the app name Cora)
PostgreSQL Server (or postgres)
Make sure that both the Private and Public checkboxes are checked for these entries.
Click OK at the bottom to save your changes.
Note: If PostgreSQL Server is not in the list:

Click "Allow another app..." at the bottom.
Click Browse and navigate to your postgres.exe file (usually located in C:\Program Files\PostgreSQL\<version>\bin\postgres.exe).
Click Add and make sure both Private and Public checkboxes are ticked.
