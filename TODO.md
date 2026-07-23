# PES-like Football Game Mechanics - Implementation Progress

## Step 1: Nearest Player Auto-Switch (PES/FIFA style) ✅
- [x] Function `updateControlledPlayer()` finds closest player to ball
- [x] WASD always controls the player closest to the ball
- [x] Golden glow on currently controlled player (shadow + golden border)

## Step 2: Card Stats Integration ✅
- [x] Speed (pac) → baseSpeed = 1.8 + (pac/100) * 3.2
- [x] Shooting (sho) → shootPower = 3.5 + (sho/100) * 5.0, accuracy based on sho
- [x] Passing (pas) → passSpeed = 3.0 + (pas/100) * 4.0, accuracy based on pas
- [x] Dribbling (drb) → dribbleSpeed = baseSpeed * (0.6 + drb/100 * 0.35)
- [x] Defense (def) → defRating = def/100, affects tackle success
- [x] Physical (pys) → physRating = pys/100, affects stamina and collision
- [x] Goalkeeper stats (div, ref, spe, pos) → AI keeper reflexes and positioning

## Step 3: Enhanced Controls ✅
- [x] WASD → Move (auto-switches to nearest player)
- [x] SPACE (hold) → Power bar for shooting
- [x] E → Pass to nearest teammate
- [x] Q → Through ball / lob pass
- [x] SHIFT → Sprint (stamina drain)
- [x] C → Jockey/defensive stance (slower but better tackling)
- [x] ESC → Pause

## Step 4: Power Bar UI ✅
- [x] Visual power bar when holding SPACE
- [x] Color-coded (green → yellow → red)
- [x] Power determines shot speed and height

## Step 5: Better Ball Physics ✅
- [x] Ball has weight (z-axis, bounces)
- [x] Ball bounce off players (collision)
- [x] Air resistance (different in air vs ground)
- [x] Lobbed through balls with Q (ball.vz)

## Step 6: AI Improvements ✅
- [x] AI uses card stats for decisions (shoot probability based on sho)
- [x] AI goalkeepers use keeper stats (ref, div for reflexes)
- [x] AI defenders track back (defRating affects aggression)
- [x] AI attackers make runs forward
- [x] AI passes to open teammates

## Step 7: Visual Enhancements ✅
- [x] Stamina bar below each player
- [x] Player names always visible
- [x] Power bar for shooting UI
- [x] Better net/goal visualization
- [x] Goal celebration animation
