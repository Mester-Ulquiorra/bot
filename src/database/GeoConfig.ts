import mongoose, { Document, SchemaTypes } from "mongoose";
import { GeoItem } from "../commands/Geo/GeoData.js";

export interface DBGeo {
	/**
	 * The user's id
	 */
	userId: string;
	/**
	 * The user's balance
	 */
	balance: {
		/**
		 * The total amount of Geo the user has
		 */
		geo: number;
		/**
		 * If the user's balance is public
		 */
		public: boolean;
	};
	/**
	 * The user's explore data
	 */
	explore: {
		/**
		 * The last time the user explored (in milliseconds)
		 */
		lastExplore: number;
	};
	/**
	 * The user's inventory
	 */
	inventory: {
		/**
		 * The items in the user's inventory
		 */
		items: Array<GeoItem>;
		/**
		 * If the user's inventory is public
		 */
		public: boolean;
	};
	/**
	 * The user's stats
	 */
	stats: {
		/**
		 * Maximum health of the user
		 */
		hp: number;
		/**
		 * Attack of the user
		 */
		attack: number;
		/**
		 * Defense (damage reduction) of the user, maximum 80%
		 */
		defense: number;
		/**
		 * Speed of the user
		 * It affects the following areas: refresh of skills
		 * 2 speed means 2x faster
		 */
		speed: number;
		/**
		 * Maximum mana of the user
		 */
		mana: number;
	};
}

export interface IDBGeo extends Document, DBGeo {}

export default mongoose.model(
	"geo",
	new mongoose.Schema<IDBGeo>({
		userId: {
			type: SchemaTypes.String,
			unique: true,
			required: true,
		},
		balance: {
			public: {
				type: SchemaTypes.Boolean,
				default: false,
			},
			geo: {
				type: SchemaTypes.Number,
				default: 0,
			},
		},
		explore: {
			lastExplore: {
				type: SchemaTypes.Number,
				default: 0,
			},
		},
		inventory: {
			public: {
				type: SchemaTypes.Boolean,
				default: false,
			},
			items: {
				type: [
					{
						name: {
							type: SchemaTypes.String,
							required: true,
						},
						count: {
							type: SchemaTypes.Number,
							required: true,
						},
					},
				],
				_id: false,
			},
		},
		stats: {
			hp: {
				type: SchemaTypes.Number,
				default: 100,
			},
			attack: {
				type: SchemaTypes.Number,
				default: 2,
			},
			defense: {
				type: SchemaTypes.Number,
				default: 0,
			},
			speed: {
				type: SchemaTypes.Number,
				default: 1,
			},
			mana: {
				type: SchemaTypes.Number,
				default: 20,
			},
		},
	})
);
