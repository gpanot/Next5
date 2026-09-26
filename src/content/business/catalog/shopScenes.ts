/**
 * Shop scenes: where the model poses, and the 6 poses that fit each place.
 * A drop picks one or more scenes, then 1 to 6 poses in each. Every pose has a sample photo
 * (scenePoseImage), made by scripts/gen-scene-poses.ts.
 */

import type { ShotId } from '../../../config/shots';
import type { ScenePose, SetTemplateSeed } from './types';

const IMG = '/images/business/us/influencer/shop';

type SceneSeed = {
  id: string;
  name: string;
  description: string;
  lighting: string;
  location: string;
  /** Existing cover photo. Default: the first pose's sample. */
  cover?: string;
  /** What the sample model wears (sample photos only, never in product prompts). */
  sampleOutfit: string;
  poses: readonly ScenePose[];
};

const p = (id: string, label: string, shot: ShotId, direction: string): ScenePose => ({ id, label, shot, direction });

/** The detail pose reads the same everywhere: the product up close, the place soft behind. */
const detail = (place: string): ScenePose =>
  p('detail', 'Detail', 'detail_closeup', `Close-up on the product details (fabric, texture, neckline, stitching) with part of her in frame, the ${place} softly blurred behind.`);

const SCENES: readonly SceneSeed[] = [
  {
    id: 'clean-white', name: 'Clean Studio', description: 'A plain white background. Best for shop listings.',
    lighting: 'Even soft studio light, no harsh shadows, true-to-life colours.',
    location: 'Seamless light-grey to white studio background, clean floor.',
    cover: `${IMG}/clean-white-1.png`, sampleOutfit: 'a cream knit top and wide-leg beige trousers',
    poses: [
      p('standing', 'Standing', 'full_body_front', 'Full body, standing tall facing the camera, weight on one hip, arms relaxed.'),
      p('half', 'Half body', 'half_body', 'Waist-up, slight three-quarter turn, one hand lightly touching the collar or strap.'),
      detail('studio'),
      p('walking', 'Walking', 'walking_motion', 'Full body, mid-stride walking toward the camera across the studio floor.'),
      p('stool', 'On a stool', 'seated_pose', 'Sitting on a simple white stool, legs crossed, the whole outfit visible.'),
      p('side', 'Side', 'side_profile', 'Full body side profile, chin slightly up, showing the silhouette and length.'),
    ],
  },
  {
    id: 'beige-wall', name: 'Soft Beige Wall', description: 'A warm wall with soft window shadows. Great for Instagram.',
    lighting: 'Soft window light with gentle diagonal shadows across the wall.',
    location: 'Warm beige textured plaster wall with a light wooden floor.',
    cover: `${IMG}/beige-wall-1.png`, sampleOutfit: 'a cream ribbed cardigan and matching midi skirt',
    poses: [
      p('leaning', 'Leaning', 'full_body_front', 'Full body, leaning one shoulder on the wall, relaxed and facing the camera.'),
      p('hair', 'Hand in hair', 'half_body', 'Waist-up in the window shadows, one hand running through her hair, soft smile.'),
      detail('plaster wall'),
      p('walking', 'Walking', 'walking_motion', 'Full body, walking slowly along the wall, looking toward the camera.'),
      p('floor', 'On the floor', 'seated_pose', 'Sitting on the wooden floor against the wall, knees up, the outfit fully visible.'),
      p('side', 'Side', 'side_profile', 'Full body side profile along the wall, face turned to the window light.'),
    ],
  },
  {
    id: 'cafe-lifestyle', name: 'Café', description: 'A bright café. Easy and natural.',
    lighting: 'Bright natural daylight, airy and relaxed.',
    location: 'Bright sunny café interior with light wood and plants, no readable signs or logos.',
    cover: `${IMG}/cafe-lifestyle-1.png`, sampleOutfit: 'a sage green satin midi slip dress',
    poses: [
      p('counter', 'At the counter', 'full_body_front', 'Full body, standing by the counter holding a coffee cup, facing the camera.'),
      p('window', 'By the window', 'half_body', 'Waist-up at a window table, laughing, holding a cup in both hands.'),
      detail('café'),
      p('walking', 'Walking in', 'walking_motion', 'Full body, walking through the café with a coffee to go.'),
      p('seated', 'Seated', 'seated_pose', 'Sitting on a café chair, legs crossed, the whole outfit visible.'),
      p('side', 'Side', 'side_profile', 'Full body side profile by the window, looking outside.'),
    ],
  },
  {
    id: 'street-urban', name: 'City Street', description: 'A clean city street in daylight.',
    lighting: 'Natural daylight, slightly warm, softly blurred background.',
    location: 'Clean modern street with concrete and glass buildings, no readable signs.',
    cover: `${IMG}/street-urban-1.png`, sampleOutfit: 'a light denim jacket, white tee and straight jeans',
    poses: [
      p('standing', 'Standing', 'full_body_front', 'Full body, standing on the sidewalk, one hand in a pocket, confident.'),
      p('over-shoulder', 'Over the shoulder', 'half_body', 'Waist-up, looking back over her shoulder at the camera.'),
      detail('street'),
      p('crossing', 'Crossing', 'walking_motion', 'Full body, mid-stride crossing the street, natural movement in the clothes.'),
      p('steps', 'On the steps', 'seated_pose', 'Sitting on wide concrete steps, relaxed, the whole outfit visible.'),
      p('side', 'Side', 'side_profile', 'Full body side profile against a glass wall.'),
    ],
  },
  {
    id: 'boutique-rack', name: 'Boutique', description: 'A small shop with a clothes rack behind.',
    lighting: 'Warm spot lighting mixed with soft daylight, elegant.',
    location: 'Minimal boutique interior with a neutral clothing rail softly blurred behind.',
    cover: `${IMG}/boutique-rack-1.png`, sampleOutfit: 'a sage green satin midi slip dress',
    poses: [
      p('by-rail', 'By the rail', 'full_body_front', 'Full body, standing beside the clothing rail, facing the camera.'),
      p('browsing', 'Browsing', 'half_body', 'Waist-up, browsing the rail with one hand on a hanger, smiling at the camera.'),
      detail('boutique'),
      p('walking', 'Walking', 'walking_motion', 'Full body, walking between the rails toward the camera.'),
      p('ottoman', 'On the ottoman', 'seated_pose', 'Sitting on a velvet ottoman, legs crossed, the outfit fully visible.'),
      p('mirror', 'At the mirror', 'side_profile', 'Full body side profile, checking the look in a tall mirror.'),
    ],
  },
  {
    id: 'resort', name: 'Resort', description: 'A sunny resort terrace with palm shadows.',
    lighting: 'Bright summer sunlight with palm shadows, fresh and vivid.',
    location: 'Pale stone resort terrace with palm shadows and the sea in the distance.',
    cover: `${IMG}/resort-1.png`, sampleOutfit: 'a white linen sundress and a straw sun hat',
    poses: [
      p('hat', 'Hand on hat', 'full_body_front', 'Full body, standing on the terrace, one hand on her sun hat.'),
      p('palms', 'Under the palms', 'half_body', 'Waist-up in palm shadows, relaxed holiday smile.'),
      detail('terrace'),
      p('walking', 'Walking', 'walking_motion', 'Full body, walking along the terrace, the fabric moving in the breeze.'),
      p('daybed', 'On the daybed', 'seated_pose', 'Sitting on the edge of a white daybed, the whole outfit visible.'),
      p('sea', 'Looking at the sea', 'side_profile', 'Full body side profile, gazing out at the sea.'),
    ],
  },
  {
    id: 'pool', name: 'Pool', description: 'A turquoise pool and a white lounge chair.',
    lighting: 'Bright midday summer sun with soft water reflections.',
    location: 'Edge of a turquoise swimming pool with pale stone tiles and a white lounge chair.',
    cover: `${IMG}/pool-1.png`, sampleOutfit: 'a white linen sundress',
    poses: [
      p('standing', 'At the edge', 'full_body_front', 'Full body, standing at the pool edge, facing the camera.'),
      p('sunglasses', 'Sunglasses', 'half_body', 'Waist-up, holding sunglasses in one hand, bright smile.'),
      detail('pool'),
      p('walking', 'Walking', 'walking_motion', 'Full body, walking along the pool edge.'),
      p('lounger', 'On the lounger', 'seated_pose', 'Sitting on the white lounge chair, legs stretched, the outfit fully visible.'),
      p('side', 'Side', 'side_profile', 'Full body side profile by the water, face to the sun.'),
    ],
  },
  {
    id: 'beach', name: 'Beach', description: 'White sand and a calm blue sea.',
    lighting: 'Warm late-afternoon sun, soft and golden.',
    location: 'Soft white sandy beach with a calm turquoise sea behind.',
    cover: `${IMG}/beach-1.png`, sampleOutfit: 'a white linen sundress',
    poses: [
      p('standing', 'On the sand', 'full_body_front', 'Full body, standing barefoot on the sand, facing the camera.'),
      p('wind', 'Wind in hair', 'half_body', 'Waist-up, the breeze in her hair, relaxed smile.'),
      detail('beach'),
      p('shoreline', 'Shoreline walk', 'walking_motion', 'Full body, walking along the shoreline, the fabric moving.'),
      p('towel', 'On a towel', 'seated_pose', 'Sitting on a beach towel, knees bent, the whole outfit visible.'),
      p('ocean', 'Facing the ocean', 'side_profile', 'Full body side profile, looking out at the ocean.'),
    ],
  },
  {
    id: 'office', name: 'Office', description: 'A bright modern office with plants.',
    lighting: 'Soft even daylight from large windows, clean and bright.',
    location: 'Bright modern office with light oak desks, white walls and green plants, no screens with readable text.',
    cover: `${IMG}/office-1.png`, sampleOutfit: 'a camel blazer, white blouse and straight trousers',
    poses: [
      p('desk', 'By the desk', 'full_body_front', 'Full body, standing by a desk holding a notebook, confident smile.'),
      p('window', 'By the window', 'half_body', 'Waist-up by the window, arms loosely crossed, friendly.'),
      detail('office'),
      p('walking', 'Walking', 'walking_motion', 'Full body, walking through the office carrying a laptop.'),
      p('chair', 'In the chair', 'seated_pose', 'Sitting in a desk chair, turned toward the camera, the outfit fully visible.'),
      p('side', 'Side', 'side_profile', 'Full body side profile near the window, looking at the city.'),
    ],
  },
  {
    id: 'gym', name: 'Gym', description: 'A clean, bright gym.',
    lighting: 'Bright clean overhead light mixed with daylight.',
    location: 'Modern bright gym with dumbbell racks and rubber floor, no readable signs or logos.',
    sampleOutfit: 'a sage green sports bra and matching leggings',
    poses: [
      p('rack', 'By the rack', 'full_body_front', 'Full body, standing by the dumbbell rack, facing the camera, strong and relaxed.'),
      p('ponytail', 'Ponytail', 'half_body', 'Waist-up, tying her hair in a ponytail, smiling.'),
      detail('gym'),
      p('walking', 'Walking', 'walking_motion', 'Full body, walking across the gym floor holding a water bottle.'),
      p('bench', 'On the bench', 'seated_pose', 'Sitting on a workout bench, elbows on knees, the outfit fully visible.'),
      p('stretch', 'Stretching', 'side_profile', 'Full body side profile, stretching one arm across her chest.'),
    ],
  },
  {
    id: 'park', name: 'Park', description: 'Green trees and a sunny path.',
    lighting: 'Soft dappled sunlight through the trees.',
    location: 'Green city park with tall trees and a gravel path.',
    sampleOutfit: 'a floral midi dress and a light denim jacket',
    poses: [
      p('path', 'On the path', 'full_body_front', 'Full body, standing on the path under the trees, facing the camera.'),
      p('tree', 'By a tree', 'half_body', 'Waist-up, leaning against a tree trunk, soft smile.'),
      detail('park'),
      p('walking', 'Walking', 'walking_motion', 'Full body, walking along the path toward the camera.'),
      p('bench', 'On a bench', 'seated_pose', 'Sitting on a wooden park bench, legs crossed, the outfit fully visible.'),
      p('side', 'Side', 'side_profile', 'Full body side profile on the grass, looking at the trees.'),
    ],
  },
  {
    id: 'runway', name: 'Fashion Show', description: 'A runway with soft stage lights.',
    lighting: 'Bright soft runway spotlights, a softly dark audience behind.',
    location: 'Sleek white fashion runway with softly blurred seated audience, no readable signs.',
    sampleOutfit: 'an elegant black satin evening dress',
    poses: [
      p('end', 'End of runway', 'full_body_front', 'Full body, the pose at the end of the runway, one hand on her hip.'),
      p('half', 'Half body', 'half_body', 'Waist-up runway shot, strong confident expression.'),
      detail('runway'),
      p('catwalk', 'Catwalk', 'walking_motion', 'Full body, mid-stride on the catwalk, walking straight at the camera.'),
      p('front-row', 'Front row', 'seated_pose', 'Sitting on a front-row chair beside the runway, legs crossed, the outfit fully visible.'),
      p('turn', 'The turn', 'side_profile', 'Full body side profile, turning at the end of the runway.'),
    ],
  },
  {
    id: 'rooftop', name: 'Rooftop', description: 'A city rooftop at golden hour.',
    lighting: 'Warm golden-hour sunset light.',
    location: 'Chic city rooftop terrace with a glass railing and the skyline behind.',
    sampleOutfit: 'a sage green satin midi slip dress',
    poses: [
      p('railing', 'At the railing', 'full_body_front', 'Full body, leaning back on the glass railing, facing the camera.'),
      p('sunset', 'Sunset glow', 'half_body', 'Waist-up in the sunset glow, soft smile.'),
      detail('rooftop'),
      p('walking', 'Walking', 'walking_motion', 'Full body, walking across the rooftop terrace.'),
      p('sofa', 'On the sofa', 'seated_pose', 'Sitting on an outdoor lounge sofa, relaxed, the outfit fully visible.'),
      p('skyline', 'Skyline', 'side_profile', 'Full body side profile, looking out at the skyline.'),
    ],
  },
  {
    id: 'home', name: 'Cozy Home', description: 'A bright, cozy living room.',
    lighting: 'Soft warm window light, calm and homey.',
    location: 'Bright cozy living room with a linen sofa, plants and light wood floor.',
    sampleOutfit: 'a cream knit loungewear set',
    poses: [
      p('window', 'By the window', 'full_body_front', 'Full body, standing by the window, facing the camera.'),
      p('mug', 'With a mug', 'half_body', 'Waist-up, holding a mug in both hands, cozy smile.'),
      detail('living room'),
      p('walking', 'Walking', 'walking_motion', 'Full body, walking across the living room.'),
      p('sofa', 'On the sofa', 'seated_pose', 'Sitting on the sofa, legs tucked to one side, the outfit fully visible.'),
      p('side', 'Side', 'side_profile', 'Full body side profile by a bookshelf.'),
    ],
  },
  {
    id: 'night-out', name: 'Night Out', description: 'A warm restaurant bar at night.',
    lighting: 'Warm low evening light with soft glowing bokeh.',
    location: 'Stylish restaurant bar at night with warm lamps and dark wood, no readable signs.',
    sampleOutfit: 'a black satin midi dress',
    poses: [
      p('bar', 'At the bar', 'full_body_front', 'Full body, standing by the bar, facing the camera.'),
      p('glass', 'Holding a glass', 'half_body', 'Waist-up, holding a glass, glowing smile.'),
      detail('bar'),
      p('walking', 'Walking in', 'walking_motion', 'Full body, walking through the restaurant toward the camera.'),
      p('stool', 'On a bar stool', 'seated_pose', 'Sitting on a bar stool, legs crossed, the outfit fully visible.'),
      p('side', 'Side', 'side_profile', 'Full body side profile at the bar, looking over her shoulder.'),
    ],
  },
];

/** Sample photo of one pose in one scene. Check it with hasManifestImage. */
export const scenePoseImage = (sceneId: string, poseId: string): string => `${IMG}/scenes/${sceneId}-${poseId}.png`;

/** For the sample photo script: scene, pose and what the sample model wears. */
export const SCENE_SAMPLES = SCENES.map((s) => ({ id: s.id, location: s.location, lighting: s.lighting, outfit: s.sampleOutfit, poses: s.poses }));

export const SHOP_TEMPLATES: readonly SetTemplateSeed[] = SCENES.map((s, i) => ({
  id: s.id,
  product: 'shop',
  name: s.name,
  description: s.description,
  coverImage: s.cover ?? scenePoseImage(s.id, s.poses[0]!.id),
  sortOrder: i + 1,
  config: { lighting: s.lighting, defaults: {}, locations: [{ id: s.id, label: s.name, direction: s.location }], poses: s.poses },
}));
