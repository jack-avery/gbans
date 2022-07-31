import { apiCall, QueryFilter } from './common';
import {
    communityVisibilityState,
    Person,
    profileState,
    UserProfile
} from './profile';
import { SteamID } from './const';
import { UserMessage } from './report';

export enum BanReason {
    Custom = 1,
    External = 2,
    Cheating = 3,
    Racism = 4,
    Harassment = 5,
    Exploiting = 6,
    WarningsExceeded = 7,
    Spam = 8,
    Language = 9,
    Profile = 10,
    ItemDescriptions = 11,
    BotHost = 12
}

export const BanReasons: Record<BanReason, string> = {
    [BanReason.Custom]: 'Custom',
    [BanReason.External]: '3rd party',
    [BanReason.Cheating]: 'Cheating',
    [BanReason.Racism]: 'Racism',
    [BanReason.Harassment]: 'Person Harassment',
    [BanReason.Exploiting]: 'Exploiting',
    [BanReason.WarningsExceeded]: 'Warnings Exceeding',
    [BanReason.Spam]: 'Spam',
    [BanReason.Language]: 'Language',
    [BanReason.Profile]: 'Profile',
    [BanReason.ItemDescriptions]: 'Item Name/Descriptions',
    [BanReason.BotHost]: 'Bot Host'
};

export const banReasonsList = [
    BanReason.Cheating,
    BanReason.Racism,
    BanReason.Harassment,
    BanReason.Exploiting,
    BanReason.WarningsExceeded,
    BanReason.Spam,
    BanReason.Language,
    BanReason.Profile,
    BanReason.ItemDescriptions,
    BanReason.External,
    BanReason.Custom
];

export enum BanType {
    Unknown = -1,
    OK = 0,
    NoComm = 1,
    Banned = 2
}

export interface BannedPerson {
    ban: Ban;
    person: Person;
}

export interface Ban {
    ban_id: number;
    net_id: number;
    steam_id: SteamID;
    cidr: string;
    author_id: SteamID;
    ban_type: BanType;
    reason: BanReason;
    reason_text: string;
    unban_reason_text: string;
    note: string;
    source: number;
    deleted: boolean;
    report_id: number;
    valid_until: Date;
    created_on: Date;
    updated_on: Date;
}

export type IAPIResponseBans = BannedPerson[];

export interface IAPIBanRecord extends Ban {
    steamid: SteamID;
    communityvisibilitystate: communityVisibilityState;
    profilestate: profileState;
    personaname: string;
    profileurl: string;
    avatar: string;
    avatarmedium: string;
    avatarfull: string;
    personastate: number;
    realname: string;
    timecreated: number;
    personastateflags: number;
    loccountrycode: string;

    // Custom attributes
    ip_addr: string;
}

export interface BansQueryFilter extends QueryFilter {
    steam_id?: SteamID;
}

export interface UnbanPayload {
    unban_reason_text: string;
}

export interface BanPayload {
    steam_id: SteamID;
    duration: string;
    ban_type: BanType;
    reason: number;
    reason_text: string;
    note: string;
    network: string;
    report_id?: number;
}

export const apiGetBans = async (
    opts?: BansQueryFilter
): Promise<IAPIBanRecord[]> => {
    const resp = await apiCall<IAPIResponseBans, BansQueryFilter>(
        `/api/bans`,
        'POST',
        opts ?? {}
    );
    return (resp ?? []).map((b): IAPIBanRecord => {
        return {
            author_id: b.ban.author_id,
            avatar: b.person.avatar,
            avatarfull: b.person.avatarfull,
            avatarmedium: b.person.avatarmedium,
            ban_id: b.ban.ban_id,
            ban_type: b.ban.ban_type,
            cidr: b.ban.cidr,
            communityvisibilitystate: b.person.communityvisibilitystate,
            created_on: b.ban.created_on,
            ip_addr: b.person.ip_addr,
            loccountrycode: b.person.loccountrycode,
            net_id: b.ban.net_id,
            note: b.ban.note,
            personaname: b.person.personaname,
            personastate: b.person.personastate,
            personastateflags: b.person.personastateflags,
            profilestate: b.person.profilestate,
            profileurl: b.person.profileurl,
            realname: b.person.realname,
            reason: b.ban.reason,
            reason_text: b.ban.reason_text,
            source: b.ban.source,
            steam_id: b.person.steam_id,
            steamid: b.person.steamid,
            timecreated: b.person.timecreated,
            updated_on: b.ban.updated_on,
            valid_until: b.ban.valid_until,
            deleted: b.ban.deleted,
            report_id: b.ban.report_id,
            unban_reason_text: b.ban.unban_reason_text
        };
    });
};

export const apiGetBan = async (ban_id: number): Promise<BannedPerson> =>
    await apiCall<BannedPerson>(`/api/ban/${ban_id}`, 'GET');

export const apiCreateBan = async (p: BanPayload): Promise<Ban> =>
    await apiCall<Ban, BanPayload>(`/api/ban`, 'POST', p);

export const apiDeleteBan = async (ban_id: number, unban_reason_text: string) =>
    await apiCall<null, UnbanPayload>(`/api/ban/${ban_id}`, 'DELETE', {
        unban_reason_text
    });

export interface AuthorMessage {
    message: UserMessage;
    author: UserProfile;
}

export const apiGetBanMessages = async (ban_id: number) =>
    await apiCall<AuthorMessage[]>(`/api/ban/${ban_id}/messages`, 'GET');

export interface CreateBanMessage {
    message: string;
}

export const apiCreateBanMessage = async (ban_id: number, message: string) =>
    await apiCall<UserMessage, CreateBanMessage>(
        `/api/ban/${ban_id}/messages`,
        'POST',
        { message }
    );

export const apiUpdateBanMessage = async (
    ban_message_id: number,
    message: string
) =>
    await apiCall(`/api/ban/message/${ban_message_id}`, 'POST', {
        body_md: message
    });

export const apiDeleteBanMessage = async (ban_message_id: number) =>
    await apiCall(`/api/ban/message/${ban_message_id}`, 'DELETE', {});
