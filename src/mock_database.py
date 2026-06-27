"""taste.node — mock database for demo and testing.

Provides deterministic sample users (ported from frontend mockData.ts)
and synthetic-data seeding utilities so the backend has real-looking
profiles to cluster and recommend against.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict, List

from sqlalchemy import Connection, delete, insert

from src.db import (
    contexts_table,
    create_user,
    ranked_items_table,
    update_user_settings,
    upsert_context,
    users_table,
)
from src.models import RankedItemInput, TasteProfile

# Ensure repo root is on path so we can import the synthetic generator
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# Import after path fix
from scripts.generate_synthetic_data import generate_profiles

# ─── Sample users (ported from web/src/data/mockData.ts) ───
# These are the 120 display names used in the frontend feed / following UI.
# The actual deterministic profile generation stays server-side via
# generate_synthetic_data.py so we don't duplicate logic.

SAMPLE_USERS: List[Dict[str, str]] = [
    {"id": "alex_12", "name": "Alex M."},
    {"id": "jordan_34", "name": "Jordan T."},
    {"id": "sam_88", "name": "Sam K."},
    {"id": "taylor_09", "name": "Taylor R."},
    {"id": "casey_22", "name": "Casey L."},
    {"id": "morgan_45", "name": "Morgan B."},
    {"id": "riley_17", "name": "Riley S."},
    {"id": "quinn_63", "name": "Quinn J."},
    {"id": "avery_29", "name": "Avery P."},
    {"id": "jules_51", "name": "Jules D."},
    {"id": "kenji_08", "name": "Kenji Y."},
    {"id": "priya_41", "name": "Priya N."},
    {"id": "luca_77", "name": "Luca R."},
    {"id": "sofia_33", "name": "Sofia G."},
    {"id": "hugo_19", "name": "Hugo B."},
    {"id": "mei_55", "name": "Mei L."},
    {"id": "omar_02", "name": "Omar F."},
    {"id": "inara_66", "name": "Inara K."},
    {"id": "dmitri_24", "name": "Dmitri V."},
    {"id": "yuki_11", "name": "Yuki S."},
    {"id": "eloise_38", "name": "Eloise M."},
    {"id": "rafael_49", "name": "Rafael C."},
    {"id": "zara_72", "name": "Zara A."},
    {"id": "nico_05", "name": "Nico P."},
    {"id": "haruto_91", "name": "Haruto T."},
    {"id": "sakura_27", "name": "Sakura W."},
    {"id": "wei_63", "name": "Wei C."},
    {"id": "minji_48", "name": "Minji K."},
    {"id": "diego_19", "name": "Diego R."},
    {"id": "kaia_76", "name": "Kaia N."},
    {"id": "amir_54", "name": "Amir H."},
    {"id": "chloe_08", "name": "Chloe B."},
    {"id": "kaz_33", "name": "Kaz O."},
    {"id": "layla_90", "name": "Layla A."},
    {"id": "ethan_11", "name": "Ethan J."},
    {"id": "nuwa_67", "name": "Nuwa L."},
    {"id": "igor_42", "name": "Igor S."},
    {"id": "freya_83", "name": "Freya O."},
    {"id": "ren_05", "name": "Ren T."},
    {"id": "anika_29", "name": "Anika P."},
    {"id": "soren_71", "name": "Soren K."},
    {"id": "mira_14", "name": "Mira D."},
    {"id": "tomas_58", "name": "Tomas L."},
    {"id": "aya_96", "name": "Aya F."},
    {"id": "vik_38", "name": "Vik B."},
    {"id": "esme_69", "name": "Esme C."},
    {"id": "jin_02", "name": "Jin H."},
    {"id": "cleo_45", "name": "Cleo R."},
    {"id": "bogdan_87", "name": "Bogdan M."},
    {"id": "lina_21", "name": "Lina Z."},
    {"id": "naoki_73", "name": "Naoki I."},
    {"id": "leo_10", "name": "Leo S."},
    {"id": "indra_55", "name": "Indra K."},
    {"id": "faye_92", "name": "Faye N."},
    {"id": "raul_36", "name": "Raul G."},
    {"id": "momo_80", "name": "Momo Y."},
    {"id": "cyrus_07", "name": "Cyrus E."},
    {"id": "asha_62", "name": "Asha B."},
    {"id": "yuuto_28", "name": "Yuuto S."},
    {"id": "nadia_50", "name": "Nadia H."},
    {"id": "cormac_15", "name": "Cormac W."},
    {"id": "mika_93", "name": "Mika L."},
    {"id": "teo_39", "name": "Teo R."},
    {"id": "vera_84", "name": "Vera K."},
    {"id": "xiang_06", "name": "Xiang W."},
    {"id": "ilse_61", "name": "Ilse D."},
    {"id": "noa_74", "name": "Noa C."},
    {"id": "tariq_32", "name": "Tariq A."},
    {"id": "suki_97", "name": "Suki T."},
    {"id": "aldo_18", "name": "Aldo M."},
    {"id": "rona_53", "name": "Rona S."},
    {"id": "kito_85", "name": "Kito N."},
    {"id": "isla_09", "name": "Isla P."},
    {"id": "farhan_46", "name": "Farhan J."},
    {"id": "umi_79", "name": "Umi H."},
    {"id": "bran_03", "name": "Bran W."},
    {"id": "solana_68", "name": "Solana C."},
    {"id": "taro_25", "name": "Taro F."},
    {"id": "anya_94", "name": "Anya T."},
    {"id": "joao_56", "name": "Joao R."},
    {"id": "sai_81", "name": "Sai P."},
    {"id": "keira_40", "name": "Keira M."},
    {"id": "oskar_12", "name": "Oskar L."},
    {"id": "reina_75", "name": "Reina S."},
    {"id": "zian_30", "name": "Zian X."},
    {"id": "calla_98", "name": "Calla N."},
    {"id": "dante_64", "name": "Dante G."},
    {"id": "kira_01", "name": "Kira H."},
    {"id": "ludo_44", "name": "Ludo B."},
    {"id": "mana_89", "name": "Mana K."},
    {"id": "elio_13", "name": "Elio P."},
    {"id": "yuna_77", "name": "Yuna L."},
    {"id": "fizan_35", "name": "Fizan A."},
    {"id": "tove_99", "name": "Tove E."},
    {"id": "ryo_57", "name": "Ryo I."},
    {"id": "azesha_22", "name": "Azesha N."},
    {"id": "piotr_86", "name": "Piotr M."},
    {"id": "sena_70", "name": "Sena O."},
    {"id": "henri_04", "name": "Henri V."},
    {"id": "marin_47", "name": "Marin W."},
    {"id": "khaled_82", "name": "Khaled F."},
    {"id": "romy_20", "name": "Romy S."},
    {"id": "tae_60", "name": "Tae H."},
    {"id": "ebele_95", "name": "Ebele J."},
    {"id": "arkady_37", "name": "Arkady S."},
    {"id": "nori_78", "name": "Nori K."},
    {"id": "omori_52", "name": "Omori T."},
    {"id": "leila_16", "name": "Leila B."},
    {"id": "henning_88", "name": "Henning P."},
    {"id": "suri_23", "name": "Suri R."},
    {"id": "jari_41", "name": "Jari K."},
    {"id": "stella_31", "name": "Stella M."},
    {"id": "jasper_65", "name": "Jasper N."},
    {"id": "xiu_72", "name": "Xiu W."},
    {"id": "filo_59", "name": "Filo G."},
    {"id": "zelda_100", "name": "Zelda C."},
    {"id": "benja_49", "name": "Benja L."},
    {"id": "ami_66", "name": "Ami F."},
    {"id": "dario_26", "name": "Dario R."},
]


def get_mock_users() -> List[Dict[str, str]]:
    """Return the static list of sample mock users."""
    return SAMPLE_USERS


def seed_synthetic_profiles(conn: Connection, n: int = 100, seed: int = 42) -> int:
    """Populate the SQLite database with *n* deterministic TasteProfiles.

    Returns the number of users created.
    """
    profiles = generate_profiles(seed=seed, n_users=n)
    for profile in profiles:
        # create_user inserts the user + default context rows
        create_user(conn, profile.user_id)
        # Upsert each context using proper RankedItemInput models
        for ctx_id, ctx in profile.contexts.items():
            item_inputs = [
                RankedItemInput(
                    venue_id=item.venue.id,
                    venue_name=item.venue.name,
                    visited_at=item.visited_at,
                    occasion_tag=item.occasion_tag,
                    is_classic=item.is_classic,
                )
                for item in ctx.ranked_list
            ]
            upsert_context(conn, profile.user_id, ctx_id, item_inputs)
    return len(profiles)


def clear_mock_data(conn: Connection) -> int:
    """Truncate users, contexts, and ranked_items. Returns total rows deleted."""
    result_items = conn.execute(delete(ranked_items_table))
    result_ctx = conn.execute(delete(contexts_table))
    result_users = conn.execute(delete(users_table))
    return (
        result_items.rowcount or 0
    ) + (result_ctx.rowcount or 0) + (result_users.rowcount or 0)
