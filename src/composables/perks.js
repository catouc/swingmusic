import { ref } from "@vue/reactivity";
import { watch } from "@vue/runtime-core";

import media from "./mediaNotification.js";
import state from "./state.js";
import playAudio from "./playAudio.js";

const current = ref(state.current);

const next = ref({
  title: "The next song",
  artists: ["... blah blah blah"],
  _id: {
    $oid: "",
  },
});

const prev = ref(state.prev);

const queue = ref(state.queue);

const search = ref("");

const putCommas = (artists) => {
  let result = [];

  artists.forEach((i, index, artists) => {
    if (index !== artists.length - 1) {
      result.push(i + ", ");
    } else {
      result.push(i);
    }
  });

  return result;
};

function updateNext(song_) {
  const index = state.queue.value.findIndex(
    (item) => item._id.$oid === song_._id.$oid
  );

  if (index == queue.value.length - 1) {
    next.value = queue.value[0];
    state.prev.value = queue.value[queue.value.length - 2];
  } else if (index == 0) {
    next.value = queue.value[1];
  } else {
    next.value = queue.value[index + 1];
  }
}

function updatePrev(song) {
  const index = state.queue.value.findIndex(
    (item) => item._id.$oid === song._id.$oid
  );

  if (index == 0) {
    prev.value = queue.value[queue.value.length - 1];
  } else if (index == queue.value.length - 1) {
    prev.value = queue.value[index - 1];
  } else {
    prev.value = queue.value[index - 1];
  }
}

const readQueue = () => {
  const prev_queue = JSON.parse(localStorage.getItem("queue"));
  const last_played = JSON.parse(localStorage.getItem("current"));

  if (last_played) {
    state.current.value = last_played;
  }

  if (prev_queue) {
    state.queue.value = prev_queue;

    updateNext(state.current.value);
    updatePrev(state.current.value);
  }
};

function focusCurrent() {
  const elem = document.getElementsByClassName("currentInQueue")[0];

  if (elem) {
    elem.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }
}

setTimeout(() => {
  watch(current, (new_current) => {
    media.showMediaNotif();

    new Promise((resolve) => {
      updateNext(new_current);
      updatePrev(new_current);
      resolve();
    }).then(() => {
      focusCurrent();
    });

    localStorage.setItem("current", JSON.stringify(new_current));
  });
}, 1000);

var key_down_fired = false;

window.addEventListener("keydown", (e) => {
  let target = e.target;
  let ctrlKey = e.ctrlKey;

  switch (e.key) {
    case "ArrowRight":
      {
        if (!key_down_fired) {
          key_down_fired = true;

          setTimeout(() => {
            key_down_fired = false;
          }, 1000);

          playAudio.playNext();
        }
      }
      break;

    case "ArrowLeft":
      {
        if (!key_down_fired) {
          key_down_fired = true;

          setTimeout(() => {
            key_down_fired = false;
          }, 1000);

          playAudio.playPrev();
        }
      }

      break;

    case " ":
      {
        if (!key_down_fired) {
          if (target.tagName == "INPUT") return;
          key_down_fired = true;

          playAudio.playPause();
        }
      }

      break;

    case "f": {
      if (!key_down_fired) {
        if (!ctrlKey) return;

        console.log("ctrl + f pressed");
        key_down_fired = true;
      }
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code == "Space") {
    key_down_fired = false;
  }
});

export default {
  putCommas,
  readQueue,
  focusCurrent,
  current,
  queue,
  next,
  prev,
  search,
};