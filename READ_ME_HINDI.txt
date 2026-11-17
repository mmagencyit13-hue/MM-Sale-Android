MMA Tradelink APK V660 (6.60.0)

1. Supabase SQL Editor में backend/V660_BUDDY_ANDROID.sql और backend/V660_DASHBOARD_SCOPE.sql चलाएँ। पहले से चल रहे Firebase और MM Buddy report setup का उपयोग होता है।
2. Supabase Edge Functions → mma-firebase-push → Code में backend/index.ts (या वही code backend/mma-firebase-push-code.txt से) deploy करें। मौजूदा Firebase secrets और verify_jwt setting इस्तेमाल करें। employee-gateway अलग function है।
3. GitHub repository में source replace करके Actions → Build MMA Tradelink V660 APK चलाएँ। बने हुए APK को existing MMA Tradelink पर update की तरह install करें।
4. Account → Notifications में permission और registration देखें। Test Notification के बाद, app recent apps से हटाकर अगले scheduled Order Form और Client Dating alerts Android notification panel में जाँचें।
5. उसी phone पर app दोबारा खोलकर login restore जाँचें। 3 दिन की inactivity पर नया sign-in माँगा जाता है। Manual logout, दूसरे device का authorised takeover और server session revocation भी sign-in माँग सकते हैं।
6. CEO और Admin login पर Normal → Dashboard → City / Outer में Entry Date summary और selected FY graph जाँचें।

Buddy Android notifications के लिए scheduled MM Buddy reports का source queue में generate होना आवश्यक है। फोन की notification permission enabled होनी चाहिए।
