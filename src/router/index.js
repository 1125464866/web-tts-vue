
import Vue from "vue"
import Router from 'vue-router'
import Entry from "../components/Entry.vue"
import AudioToWord from "@/view/AudioToWord"
import WordToAudio from "@/view/WordToAudio"
import WordToAudioV2 from "@/view/WordToAudioV2"
import FastWhisper from "@/view/fastWhisper.vue"

Vue.use(Router)
export default new Router({
    routes: [
        {
            path: '/',
            redirect: 'entry'
        },
        {
            path: "/entry",
            name: "Entry",
            component: Entry
        },
        {
            path: "/audioToWord",
            name: "AudioToWord",
            component: AudioToWord
        },
        {
            path: "/wordToAudio",
            name: "WordToAudio",
            component: WordToAudio
        },
        {
            path: "/wordToAudioV2",
            name: "WordToAudioV2",
            component: WordToAudioV2
        },
        {
            path: "/FastWhisper",
            name: "FastWhisper",
            component: FastWhisper
        },
    ]
})
