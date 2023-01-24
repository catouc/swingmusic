from flask import Blueprint, request
from app import settings

from app.logger import log
from app.lib import populate
from app.db.store import Store
from app.utils import background
from app.lib.watchdogg import Watcher as WatchDog
from app.db.sqlite.settings import SettingsSQLMethods as sdb

api = Blueprint("settings", __name__, url_prefix="/")


def get_child_dirs(parent: str, children: list[str]):
    """Returns child directories in a list, given a parent directory"""

    return [_dir for _dir in children if _dir.startswith(parent) and _dir != parent]


@background
def rebuild_store(db_dirs: list[str]):
    """
    Restarts the watchdog and rebuilds the music library.
    """

    log.info("Rebuilding library...")
    Store.remove_tracks_by_dir_except(db_dirs)

    Store.load_all_tracks()
    Store.process_folders()
    Store.load_albums()
    Store.load_artists()

    populate.Populate()
    WatchDog().restart()

    log.info("Rebuilding library... ✅")


@api.route("/settings/add-root-dirs", methods=["POST"])
def add_root_dirs():
    """
    Add custom root directories to the database.
    """
    msg = {"msg": "Failed! No directories were given."}

    data = request.get_json()

    if data is None:
        return msg, 400

    try:
        new_dirs: list[str] = data["new_dirs"]
        removed_dirs: list[str] = data["removed"]
    except KeyError:
        return msg, 400

    def finalize(new_: list[str], removed_: list[str], db_dirs_: list[str]):
        sdb.remove_root_dirs(removed_)
        sdb.add_root_dirs(new_)
        rebuild_store(db_dirs_)

    # ---
    db_dirs = sdb.get_root_dirs()
    _h = "$home"

    try:
        if db_dirs[0] == _h and new_dirs[0] == _h.strip():
            return {"msg": "Not changed!"}

        if db_dirs[0] == _h:
            sdb.remove_root_dirs(db_dirs)

        if new_dirs[0] == _h:
            finalize([_h], db_dirs, [settings.USER_HOME_DIR])

            return {"root_dirs": [_h]}
    except IndexError:
        pass

    for _dir in new_dirs:
        children = get_child_dirs(_dir, db_dirs)
        removed_dirs.extend(children)
    # ---

    for _dir in removed_dirs:
        try:
            db_dirs.remove(_dir)
        except ValueError:
            pass

    db_dirs.extend(new_dirs)
    db_dirs = [dir_ for dir_ in db_dirs if dir_ != _h]

    finalize(new_dirs, removed_dirs, db_dirs)

    return {"root_dirs": db_dirs}


@api.route("/settings/get-root-dirs", methods=["GET"])
def get_root_dirs():
    """
    Get custom root directories from the database.
    """
    dirs = sdb.get_root_dirs()

    return {"dirs": dirs}
