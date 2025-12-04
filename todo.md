[x] update data model to support the following features:
- the user should be able to go to the "shop" to "buy" items using currency (tokens)
- The shop will have a few different "Types" of items. some have functionality (like today), others are just decorative, it should be organized.
- this means they have their own library of items they can choose from, give them some currency to start out with when a new user is created (maybe 5?)
- every day the user logs in, they earn a new currency, item's should cost between 3 to 15 tokens
- eventually they will have the option to purchase new tokens to unlock things faster.
- Make it easier to add new items to the shop, right now I have to delete everything and re-seed. I expect the shop to grow overtime.

[x] create an onboarding flow for a new user, a tutorial to get them to buy the basic items and place them
- should only show once
- teaches the user how the shop works, how to place items, etc
- a new user needs to be seeded with the basic computer, and they need to: open storage, place the computer, click it, open shop, buy an item (desk?), place it
- optionally can skip the onboarding
- ensure the feature matches the vibe and style of the app, and is built in a clean and scalable way

[x] Support one user visiting another user's room
- The user should have the ability to share an ephemeral link to a friend, to visit their room. They can close the link at any time.
- we need to utilize convex realtime features to create "presence", with a tracked cursor (send batched cursor positions every time-step, replay them on the frontend, I think there may be an existing solution for this online)
- Create a placeholder asset for the user (and visitors) cursor that tracks onto the real cursor. This is the user's "character". I expect it to be somewhat customizable and animated in the future.

[x] When in a shared room, allow basic figma-like text chat
- using the '/' key to start typing
- batch keystrokes just like cursor updates
- tie the text to the cursor, match color

[x] in addition to daily check ins, add a sharing mechanism that gives a user tokens as well
- give users an invite link and when a new user is created from it, credit the user a token

[] Figure out how to encourage the user to set this as their default browser page.
- this may need to be a chrome extension? I'm not sure