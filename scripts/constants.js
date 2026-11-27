/** The module id, which is also the flag scope and the settings namespace. */
export const MODULE_ID = "cameo";

/** The world's folder of faction marks, such as clan symbols. */
export const MARK_FOLDER = "markFolder";
/** The actor data that picks a mark, as a comma-separated list of dotted paths. */
export const MARK_FIELDS = "markFields";
/** The folder's file paths, listed by the GM. Hidden: players may not browse files. */
export const MARK_INDEX = "markIndex";
/** Whether the banderole carries the token's name. */
export const SHOW_NAME = "showName";
/** Whether a panel is kept to actors a player owns. */
export const PLAYERS_ONLY = "playerCharactersOnly";
/** Each player's own switch, and how long they must rest on a token. */
export const ENABLED = "enabled";
export const DELAY = "delay";

/** An actor flag that overrides the matched mark: a file path, or MARK_NONE. */
export const MARK_FLAG = "mark";
/** The flag value that means "no mark on this one". */
export const MARK_NONE = "none";
