--Readme document for *Jaden Kim*, *jadensk@uci.edu*, *jadensk*--

1. How many assignment points do you believe you completed (replace the *'s with your numbers)?

10/10
- 1/1 The ability to log overnight sleep
- 1/1 The ability to log sleepiness during the day
- 1/1 The ability to view these two categories of logged data
- 2/2 Either using a native device resource or backing up logged data
- 2/2 Following good principles of mobile design
- 2/2 Creating a compelling app
- 1/1 A readme and demo video which explains how these features were implemented and their design rationale

2. How long, in hours, did it take you to complete this assignment?
60


3. What online resources did you consult when completing this assignment? (list specific URLs)
https://ionicframework.com/docs/cli/commands/generate
https://ionicframework.com/docs/api/datetime
https://capacitorjs.com/docs/apis/preferences
https://ionicframework.com/docs/theming/dark-mode
https://ionic.io/ionicons
Claude for color schemes & design choices.


4. What classmates or other individuals did you consult as part of this assignment? What did you discuss?
None.


5. Is there anything special we need to know in order to run your code?
Make sure to run "npm install" before "ionic serve" while cd into the "sleeptracker" folder.


--Aim for no more than two sentences for each of the following questions.--


6. Did you design your app with a particular type of user in mind? If so, whom?
I designed my app with the average person in mind. So I strictly used buttons, pickers, and tags.


7. Did you design your app specifically for iOS or Android, or both?
I designed my app for mainly iOS devices, but it should work for standard Android devices as well.


8. How can a person log overnight sleep in your app? Why did you choose to support logging overnight sleep in this way?
You can tap 'Going to bed' when you go to sleep and 'I'm awake' in the morning, or tap 'Log sleep'
to enter the times afterward (you only pick times; the date is worked out for you, or you can tap the
date under 'Woke up' to log an earlier night you forgot). I supported both because some people log at
bedtime and others in the morning, and either way it takes a few seconds.


9. How can a person log sleepiness during the day in your app? Why did you choose to support logging sleepiness in this way?
Tap a number from 1–7 in the 'Check In' card on Today; a screen then shows all seven Stanford
descriptions so you can confirm, add an optional tag like 'Before coffee,' and save.
The color-coded buttons make a check-in quick, and the descriptions keep the number's meaning clear.


10. How can a person view the data they logged in your app? Why did you choose to support viewing logged data in this way?
The History tab groups everything by day (each night first, then that day's check-ins), with
All/Sleep/Sleepiness filters, tap-to-edit, and swipe-to-delete. Putting each night next to the next
day's sleepiness makes it easy to see how sleep affected the day.


11. Which feature choose--using a native device resource, backing up logged data, or both?
Backing up logged data.


12. If you used a native device resource, what feature did you add? How does this feature change the app's experience for a user?
N/A


13. If you backed up logged data, where does it back up to?
It's saved with the Capacitor Preferences plugin, which uses the browser's localStorage on the web
(keys starting with CapacitorStorage.sleeptracker.) and permanent app storage on iOS and Android.
Every add, edit, or delete is saved right away and reloaded when the app opens; I picked Preferences
because, unlike IndexedDB storage, the phone won't clear it, and the data is small enough that speed
isn't an issue.

14. How does your app implement or follow principles of good mobile design?
Logging needs no typing thanks to large buttons, pickers, tags, and smart defaults, and mistakes are
blocked or easy to reverse with an Undo button. The app opens in a dark theme at night and a light
theme during the day until you pick one (which it remembers), with contrast and numbers shown
alongside every sleepiness color.