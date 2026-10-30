// Voice follow for the teleprompter: how many script words have been read, from what speech recognition heard.
// Lives in the shared recorder core; re-exported here for the unit tests.

export { followPointer, normWord } from './recorderCore';
