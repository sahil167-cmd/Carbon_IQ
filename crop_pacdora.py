import os
from PIL import Image

os.makedirs('shipmind-ai/public/pack', exist_ok=True)

img1 = Image.open('pack/Screenshot 2026-09-09 161408.png')
img2 = Image.open('pack/Screenshot 2026-09-09 161416.png')

cols1 = [
    (19, 344),
    (374, 699),
    (729, 1053),
    (1083, 1408)
]

r0_img1 = (16, 341)
r1_img1 = (453, 777)

# Adjust padding: inside the card, box is from y + 25 to y + 270, x + 15 to x + 310
def get_card_crop_1(col_idx, row_idx):
    c = cols1[col_idx]
    r = r0_img1 if row_idx == 0 else r1_img1
    # Card is from c[0] to c[1], r[0] to r[1]
    # Remove outer border and top corner icons (top 20px) and bottom border (bottom 40px)
    return (c[0] + 12, r[0] + 25, c[1] - 12, r[1] - 35)

crops_img1 = {
    'pack_square_shipping.png': get_card_crop_1(0, 0),
    'pack_fefco_0201.png': get_card_crop_1(1, 0),
    'pack_fefco_0202.png': get_card_crop_1(2, 0),
    'pack_square_design.png': get_card_crop_1(3, 0),

    'pack_auto_lock.png': get_card_crop_1(0, 1),
    'pack_shipping_box.png': get_card_crop_1(1, 1),
    'pack_tuck_end.png': get_card_crop_1(2, 1),
    'pack_fefco_0711.png': get_card_crop_1(3, 1),
}

for name, bbox in crops_img1.items():
    cropped = img1.crop(bbox)
    out_path = os.path.join('shipmind-ai/public/pack', name)
    cropped.save(out_path, 'PNG')

cols2 = [
    (19, 344),
    (374, 699),
    (729, 1053),
    (1083, 1408)
]
r0_img2 = (39, 363)
r1_img2 = (508, 832)

def get_card_crop_2(col_idx, row_idx):
    c = cols2[col_idx]
    r = r0_img2 if row_idx == 0 else r1_img2
    return (c[0] + 12, r[0] + 25, c[1] - 12, r[1] - 35)

crops_img2 = {
    'pack_double_hook_flip.png': get_card_crop_2(0, 0),
    'pack_box_with_handle.png': get_card_crop_2(1, 0),
    'pack_fefco_0414.png': get_card_crop_2(2, 0),
    'pack_fefco_0203.png': get_card_crop_2(3, 0),

    'pack_tuck_lock_mailer.png': get_card_crop_2(0, 1),
    'pack_brown_design.png': get_card_crop_2(1, 1),
    'pack_mailer_box.png': get_card_crop_2(2, 1),
    'pack_shipping_duo.png': get_card_crop_2(3, 1),
}

for name, bbox in crops_img2.items():
    cropped = img2.crop(bbox)
    out_path = os.path.join('shipmind-ai/public/pack', name)
    cropped.save(out_path, 'PNG')

print("All 16 authentic Pacdora box images cropped perfectly!")
