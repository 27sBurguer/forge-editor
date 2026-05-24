export const LUA_KEYWORDS = [
	"and", "break", "continue", "do", "else", "elseif", "end", "export", "false", "for", "function", "if", "in", "local", "nil", "not", "or", "repeat", "return", "self", "then", "true", "type", "typeof", "until", "while",
];

export const SERVICE_NAMES = [
	"Workspace", "Players", "Lighting", "MaterialService", "NetworkClient", "ReplicatedFirst", "ReplicatedStorage", "ServerScriptService", "ServerStorage", "StarterGui", "StarterPack", "StarterPlayer", "Teams", "SoundService", "TextChatService", "CollectionService", "TweenService", "RunService", "UserInputService", "ContextActionService", "Debris", "HttpService", "MarketplaceService", "TeleportService", "DataStoreService", "MemoryStoreService", "MessagingService", "BadgeService", "GroupService", "PhysicsService", "PathfindingService", "ProximityPromptService", "GuiService", "GamepadService", "HapticService", "LocalizationService", "PolicyService", "AnalyticsService", "AvatarEditorService", "AssetService", "InsertService", "ContentProvider", "Selection", "ChangeHistoryService", "ScriptEditorService", "TestService", "TextService", "VoiceChatService",
];

export const GLOBALS = [
	"game", "workspace", "script", "shared", "_G", "Enum", "Instance", "CFrame", "Vector2", "Vector3", "Vector3int16", "Color3", "UDim", "UDim2", "Ray", "Region3", "Rect", "BrickColor", "NumberRange", "NumberSequence", "NumberSequenceKeypoint", "ColorSequence", "ColorSequenceKeypoint", "TweenInfo", "Random", "DateTime", "Axes", "Faces", "OverlapParams", "RaycastParams", "PhysicalProperties", "PathWaypoint", "DockWidgetPluginGuiInfo", "task", "math", "string", "table", "coroutine", "os", "debug", "utf8", "buffer", "print", "warn", "error", "assert", "require", "pairs", "ipairs", "next", "select", "tonumber", "tostring", "typeof", "type", "pcall", "xpcall", "rawequal", "rawget", "rawset", "setmetatable", "getmetatable", "collectgarbage", "elapsed", "tick", "time", "wait", "spawn", "delay",
];

export const INSTANCE_METHODS = [
	["WaitForChild", "WaitForChild(\"${1:Name}\")", "Instance method", "Wait until a named child exists. Use mainly for objects replicated asynchronously."],
	["FindFirstChild", "FindFirstChild(\"${1:Name}\")", "Instance method", "Returns the first direct child with the given name, or nil."],
	["FindFirstChildOfClass", "FindFirstChildOfClass(\"${1:ClassName}\")", "Instance method", "Returns the first child whose ClassName matches."],
	["FindFirstChildWhichIsA", "FindFirstChildWhichIsA(\"${1:ClassName}\", ${2:false})", "Instance method", "Returns the first child that IsA the given class."],
	["FindFirstAncestor", "FindFirstAncestor(\"${1:Name}\")", "Instance method", "Finds the first ancestor with the given name."],
	["FindFirstAncestorOfClass", "FindFirstAncestorOfClass(\"${1:ClassName}\")", "Instance method", "Finds the first ancestor with the given ClassName."],
	["FindFirstAncestorWhichIsA", "FindFirstAncestorWhichIsA(\"${1:ClassName}\")", "Instance method", "Finds the first ancestor that IsA the given class."],
	["GetChildren", "GetChildren()", "Instance method", "Returns direct children as an array."],
	["GetDescendants", "GetDescendants()", "Instance method", "Returns all descendants as an array."],
	["GetAttribute", "GetAttribute(\"${1:AttributeName}\")", "Instance method", "Reads an attribute value."],
	["SetAttribute", "SetAttribute(\"${1:AttributeName}\", ${2:value})", "Instance method", "Sets or clears an attribute value."],
	["GetAttributes", "GetAttributes()", "Instance method", "Returns a dictionary of attributes."],
	["GetAttributeChangedSignal", "GetAttributeChangedSignal(\"${1:AttributeName}\")", "Instance method", "Returns a signal fired when the attribute changes."],
	["GetPropertyChangedSignal", "GetPropertyChangedSignal(\"${1:Property}\")", "Instance method", "Returns a signal fired when a property changes."],
	["IsA", "IsA(\"${1:ClassName}\")", "Instance method", "Checks class inheritance."],
	["Clone", "Clone()", "Instance method", "Clones the instance and descendants."],
	["Destroy", "Destroy()", "Instance method", "Destroys the instance."],
	["ClearAllChildren", "ClearAllChildren()", "Instance method", "Destroys all children."],
	["GetFullName", "GetFullName()", "Instance method", "Returns full hierarchy path."],
	["IsDescendantOf", "IsDescendantOf(${1:ancestor})", "Instance method", "Checks if this instance descends from another."],
	["IsAncestorOf", "IsAncestorOf(${1:descendant})", "Instance method", "Checks if this instance is an ancestor of another."],
	["AddTag", "AddTag(\"${1:Tag}\")", "Instance tag method", "Adds a tag to this instance."],
	["RemoveTag", "RemoveTag(\"${1:Tag}\")", "Instance tag method", "Removes a tag from this instance."],
	["HasTag", "HasTag(\"${1:Tag}\")", "Instance tag method", "Checks if the instance has a tag."],
	["GetTags", "GetTags()", "Instance tag method", "Returns all tags on this instance."],
	["GetDebugId", "GetDebugId(${1:0})", "Debug method", "Returns a debug identifier."],
];

export const PV_INSTANCE_METHODS = [
	["PivotTo", "PivotTo(${1:cframe})", "PVInstance method", "Moves a model or part using its pivot."],
	["GetPivot", "GetPivot()", "PVInstance method", "Returns the current pivot CFrame."],
];

export const MODEL_METHODS = [
	["GetBoundingBox", "GetBoundingBox()", "Model method", "Returns bounding CFrame and size."],
	["GetExtentsSize", "GetExtentsSize()", "Model method", "Returns model extents size."],
	["MoveTo", "MoveTo(${1:position})", "Model method", "Moves model to position."],
	["ScaleTo", "ScaleTo(${1:scale})", "Model method", "Scales model around pivot."],
	["GetScale", "GetScale()", "Model method", "Returns model scale."],
	["MakeJoints", "MakeJoints()", "Model method", "Creates legacy joints."],
	["BreakJoints", "BreakJoints()", "Model method", "Breaks joints."],
];

export const BASE_PART_METHODS = [
	["ApplyImpulse", "ApplyImpulse(${1:impulse})", "BasePart method", "Applies impulse to the assembly."],
	["ApplyAngularImpulse", "ApplyAngularImpulse(${1:impulse})", "BasePart method", "Applies angular impulse."],
	["ApplyImpulseAtPosition", "ApplyImpulseAtPosition(${1:impulse}, ${2:position})", "BasePart method", "Applies impulse at world position."],
	["GetMass", "GetMass()", "BasePart method", "Returns part mass."],
	["GetConnectedParts", "GetConnectedParts(${1:true})", "BasePart method", "Returns physically connected parts."],
	["GetTouchingParts", "GetTouchingParts()", "BasePart method", "Returns currently touching parts."],
	["SetNetworkOwner", "SetNetworkOwner(${1:player})", "BasePart method", "Sets physics ownership."],
	["GetNetworkOwner", "GetNetworkOwner()", "BasePart method", "Gets physics owner."],
	["CanSetNetworkOwnership", "CanSetNetworkOwnership()", "BasePart method", "Checks network ownership permission."],
	["MakeJoints", "MakeJoints()", "BasePart method", "Creates legacy joints."],
	["BreakJoints", "BreakJoints()", "BasePart method", "Breaks joints."],
];

export const SIGNAL_METHODS = [
	["Connect", "Connect(function(${1})\n\t${2}\nend)", "RBXScriptSignal", "Connects a callback to a signal."],
	["Once", "Once(function(${1})\n\t${2}\nend)", "RBXScriptSignal", "Runs the callback once, then disconnects."],
	["Wait", "Wait()", "RBXScriptSignal", "Yields until the signal fires."],
	["ConnectParallel", "ConnectParallel(function(${1})\n\t${2}\nend)", "RBXScriptSignal", "Connects in parallel execution when allowed."],
];

export const COMMON_EVENTS = [
	["Changed", "Changed:Connect(function(${1:property})\n\t${2}\nend)", "Event", "Fires when a property changes."],
	["ChildAdded", "ChildAdded:Connect(function(${1:child})\n\t${2}\nend)", "Event", "Fires when a child is added."],
	["ChildRemoved", "ChildRemoved:Connect(function(${1:child})\n\t${2}\nend)", "Event", "Fires when a child is removed."],
	["DescendantAdded", "DescendantAdded:Connect(function(${1:descendant})\n\t${2}\nend)", "Event", "Fires when a descendant is added."],
	["DescendantRemoving", "DescendantRemoving:Connect(function(${1:descendant})\n\t${2}\nend)", "Event", "Fires before a descendant is removed."],
	["AncestryChanged", "AncestryChanged:Connect(function(${1:child}, ${2:parent})\n\t${3}\nend)", "Event", "Fires when ancestry changes."],
	["AttributeChanged", "AttributeChanged:Connect(function(${1:attributeName})\n\t${2}\nend)", "Event", "Fires when an attribute changes."],
	["Destroying", "Destroying:Connect(function()\n\t${1}\nend)", "Event", "Fires before destruction."],
];

export const COMMON_PROPERTIES = [
	"Name", "Parent", "ClassName", "Archivable", "Attributes", "Tags", "Position", "Orientation", "Rotation", "CFrame", "PivotOffset", "Size", "Color", "Transparency", "Reflectance", "Material", "MaterialVariant", "Anchored", "CanCollide", "CanTouch", "CanQuery", "Massless", "AssemblyLinearVelocity", "AssemblyAngularVelocity", "AssemblyMass", "CustomPhysicalProperties", "PrimaryPart", "WorldPivot", "HumanoidRootPart", "Health", "MaxHealth", "WalkSpeed", "JumpPower", "JumpHeight", "UseJumpPower", "AutoRotate", "Sit", "PlatformStand", "DisplayName", "Enabled", "Visible", "Active", "Selectable", "Text", "TextColor3", "TextSize", "TextScaled", "TextWrapped", "Font", "BackgroundColor3", "BackgroundTransparency", "BorderSizePixel", "Image", "ImageColor3", "ImageTransparency", "Value", "Volume", "PlaybackSpeed", "TimePosition", "Looped", "Playing",
];

export const CONTEXT_COMPLETIONS = {
	DataModel: {
		methods: [
			["GetService", "GetService(\"${1:Players}\")", "DataModel method", "Returns a service by name."],
			["FindService", "FindService(\"${1:Players}\")", "DataModel method", "Returns a service if it exists."],
			["BindToClose", "BindToClose(function()\n\t${1}\nend)", "DataModel method", "Runs when the server shuts down."],
			["GetDescendants", "GetDescendants()", "DataModel method", "Returns all descendants."],
		],
	},
	Workspace: {
		methods: [
			["Raycast", "Raycast(${1:origin}, ${2:direction}, ${3:raycastParams})", "Workspace method", "Casts a ray and returns a RaycastResult."],
			["Blockcast", "Blockcast(${1:cframe}, ${2:size}, ${3:direction}, ${4:raycastParams})", "Workspace method", "Casts a block shape."],
			["Spherecast", "Spherecast(${1:position}, ${2:radius}, ${3:direction}, ${4:raycastParams})", "Workspace method", "Casts a sphere shape."],
			["Shapecast", "Shapecast(${1:part}, ${2:direction}, ${3:raycastParams})", "Workspace method", "Casts an arbitrary part shape."],
			["GetPartBoundsInBox", "GetPartBoundsInBox(${1:cframe}, ${2:size}, ${3:overlapParams})", "Workspace method", "Gets parts in an oriented box."],
			["GetPartBoundsInRadius", "GetPartBoundsInRadius(${1:position}, ${2:radius}, ${3:overlapParams})", "Workspace method", "Gets parts in radius."],
			["GetPartsInPart", "GetPartsInPart(${1:part}, ${2:overlapParams})", "Workspace method", "Gets parts overlapping a part."],
			["GetServerTimeNow", "GetServerTimeNow()", "Workspace method", "Returns synchronized server time."],
		],
	},
	Players: {
		methods: [
			["GetPlayers", "GetPlayers()", "Players method", "Returns all connected Player objects."],
			["GetPlayerFromCharacter", "GetPlayerFromCharacter(${1:character})", "Players method", "Returns a Player from their character model."],
			["GetUserIdFromNameAsync", "GetUserIdFromNameAsync(\"${1:Username}\")", "Players method", "Gets a user ID from a username."],
			["GetNameFromUserIdAsync", "GetNameFromUserIdAsync(${1:userId})", "Players method", "Gets username from user ID."],
			["GetFriendsAsync", "GetFriendsAsync(${1:userId})", "Players method", "Returns a friend pages object."],
			["GetHumanoidDescriptionFromUserId", "GetHumanoidDescriptionFromUserId(${1:userId})", "Players method", "Returns avatar HumanoidDescription."],
			["CreateHumanoidModelFromUserId", "CreateHumanoidModelFromUserId(${1:userId})", "Players method", "Creates avatar model from user ID."],
			["CreateHumanoidModelFromDescription", "CreateHumanoidModelFromDescription(${1:description}, Enum.HumanoidRigType.${2:R15})", "Players method", "Creates avatar model from description."],
			["GetUserThumbnailAsync", "GetUserThumbnailAsync(${1:userId}, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size420x420)", "Players method", "Gets avatar thumbnail."],
		],
		events: [
			["PlayerAdded", "PlayerAdded:Connect(function(${1:player})\n\t${2}\nend)", "Players event", "Fires when a player joins."],
			["PlayerRemoving", "PlayerRemoving:Connect(function(${1:player})\n\t${2}\nend)", "Players event", "Fires before a player leaves."],
		],
	},
	Player: {
		methods: [
			["LoadCharacter", "LoadCharacter()", "Player method", "Respawns the player's character."],
			["LoadCharacterWithHumanoidDescription", "LoadCharacterWithHumanoidDescription(${1:description})", "Player method", "Loads character with description."],
			["GetMouse", "GetMouse()", "Player method", "Gets local player's mouse. Client only."],
			["Kick", "Kick(\"${1:Reason}\")", "Player method", "Kicks the player from the server."],
			["HasAppearanceLoaded", "HasAppearanceLoaded()", "Player method", "Checks character appearance load state."],
			["GetJoinData", "GetJoinData()", "Player method", "Returns join data."],
			["IsFriendsWith", "IsFriendsWith(${1:userId})", "Player method", "Checks friendship."],
			["GetRankInGroup", "GetRankInGroup(${1:groupId})", "Player method", "Returns group rank."],
			["GetRoleInGroup", "GetRoleInGroup(${1:groupId})", "Player method", "Returns group role."],
		],
		events: [
			["CharacterAdded", "CharacterAdded:Connect(function(${1:character})\n\tlocal humanoid = character:WaitForChild(\"Humanoid\")\n\t${2}\nend)", "Player event", "Fires when character spawns."],
			["CharacterRemoving", "CharacterRemoving:Connect(function(${1:character})\n\t${2}\nend)", "Player event", "Fires before character is removed."],
			["Chatted", "Chatted:Connect(function(${1:message})\n\t${2}\nend)", "Player event", "Fires when player chats."],
		],
		properties: ["UserId", "Name", "DisplayName", "Character", "Team", "TeamColor", "Backpack", "PlayerGui", "StarterGear", "leaderstats", "AccountAge", "MembershipType"],
	},
	Humanoid: {
		methods: [
			["MoveTo", "MoveTo(${1:position})", "Humanoid method", "Moves humanoid toward a position."],
			["Move", "Move(${1:moveDirection}, ${2:false})", "Humanoid method", "Moves humanoid in direction."],
			["ChangeState", "ChangeState(Enum.HumanoidStateType.${1:Jumping})", "Humanoid method", "Forces humanoid state."],
			["GetState", "GetState()", "Humanoid method", "Returns current humanoid state."],
			["SetStateEnabled", "SetStateEnabled(Enum.HumanoidStateType.${1:Jumping}, ${2:true})", "Humanoid method", "Enables/disables a state."],
			["GetStateEnabled", "GetStateEnabled(Enum.HumanoidStateType.${1:Jumping})", "Humanoid method", "Checks if state is enabled."],
			["TakeDamage", "TakeDamage(${1:damage})", "Humanoid method", "Deals damage."],
			["EquipTool", "EquipTool(${1:tool})", "Humanoid method", "Equips a Tool."],
			["UnequipTools", "UnequipTools()", "Humanoid method", "Unequips tools."],
			["LoadAnimation", "LoadAnimation(${1:animation})", "Humanoid method", "Loads an animation track."],
		],
		events: [
			["Died", "Died:Connect(function()\n\t${1}\nend)", "Humanoid event", "Fires when humanoid dies."],
			["HealthChanged", "HealthChanged:Connect(function(${1:health})\n\t${2}\nend)", "Humanoid event", "Fires when health changes."],
			["StateChanged", "StateChanged:Connect(function(${1:oldState}, ${2:newState})\n\t${3}\nend)", "Humanoid event", "Fires when state changes."],
			["MoveToFinished", "MoveToFinished:Connect(function(${1:reached})\n\t${2}\nend)", "Humanoid event", "Fires after MoveTo finishes."],
		],
		properties: ["Health", "MaxHealth", "WalkSpeed", "JumpPower", "JumpHeight", "UseJumpPower", "AutoRotate", "Sit", "PlatformStand", "RigType", "RootPart", "MoveDirection", "DisplayName", "HipHeight"],
	},
	RemoteEvent: {
		methods: [
			["FireServer", "FireServer(${1})", "RemoteEvent method", "Client sends event to server."],
			["FireClient", "FireClient(${1:player}, ${2})", "RemoteEvent method", "Server sends event to one client."],
			["FireAllClients", "FireAllClients(${1})", "RemoteEvent method", "Server sends event to all clients."],
		],
		events: [
			["OnServerEvent", "OnServerEvent:Connect(function(${1:player}, ${2:...})\n\t${3}\nend)", "RemoteEvent event", "Server receives client event."],
			["OnClientEvent", "OnClientEvent:Connect(function(${1:...})\n\t${2}\nend)", "RemoteEvent event", "Client receives server event."],
		],
	},
	RemoteFunction: {
		methods: [
			["InvokeServer", "InvokeServer(${1})", "RemoteFunction method", "Client invokes server."],
			["InvokeClient", "InvokeClient(${1:player}, ${2})", "RemoteFunction method", "Server invokes client."],
		],
		callbacks: [
			["OnServerInvoke", "OnServerInvoke = function(${1:player}, ${2:...})\n\t${3}\nend", "RemoteFunction callback", "Server callback for client invoke."],
			["OnClientInvoke", "OnClientInvoke = function(${1:...})\n\t${2}\nend", "RemoteFunction callback", "Client callback for server invoke."],
		],
	},
	RunService: {
		methods: [
			["BindToRenderStep", "BindToRenderStep(\"${1:Name}\", Enum.RenderPriority.${2:Camera}.Value, function(${3:deltaTime})\n\t${4}\nend)", "RunService method", "Binds a render step callback."],
			["UnbindFromRenderStep", "UnbindFromRenderStep(\"${1:Name}\")", "RunService method", "Removes a render step binding."],
			["IsClient", "IsClient()", "RunService method", "True on client."],
			["IsServer", "IsServer()", "RunService method", "True on server."],
			["IsStudio", "IsStudio()", "RunService method", "True in the edit environment."],
			["IsRunning", "IsRunning()", "RunService method", "True while simulation is running."],
		],
		events: [
			["Heartbeat", "Heartbeat:Connect(function(${1:deltaTime})\n\t${2}\nend)", "RunService event", "Fires every frame after physics."],
			["RenderStepped", "RenderStepped:Connect(function(${1:deltaTime})\n\t${2}\nend)", "RunService event", "Fires before rendering. Client only."],
			["Stepped", "Stepped:Connect(function(${1:time}, ${2:deltaTime})\n\t${3}\nend)", "RunService event", "Legacy step event."],
			["PreRender", "PreRender:Connect(function(${1:deltaTime})\n\t${2}\nend)", "RunService event", "Runs before rendering."],
			["PreSimulation", "PreSimulation:Connect(function(${1:deltaTime})\n\t${2}\nend)", "RunService event", "Runs before physics simulation."],
			["PostSimulation", "PostSimulation:Connect(function(${1:deltaTime})\n\t${2}\nend)", "RunService event", "Runs after physics simulation."],
		],
	},
	TweenService: { methods: [["Create", "Create(${1:instance}, TweenInfo.new(${2:0.25}), {\n\t${3:Transparency} = ${4:1},\n})", "TweenService method", "Creates a Tween."], ["GetValue", "GetValue(${1:alpha}, Enum.EasingStyle.${2:Quad}, Enum.EasingDirection.${3:Out})", "TweenService method", "Calculates eased alpha."], ["SmoothDamp", "SmoothDamp(${1:current}, ${2:target}, ${3:velocity}, ${4:smoothTime})", "TweenService method", "Smoothly damps a value."]] },
	CollectionService: { methods: [["AddTag", "AddTag(${1:instance}, \"${2:Tag}\")", "CollectionService method", "Adds tag."], ["RemoveTag", "RemoveTag(${1:instance}, \"${2:Tag}\")", "CollectionService method", "Removes tag."], ["HasTag", "HasTag(${1:instance}, \"${2:Tag}\")", "CollectionService method", "Checks tag."], ["GetTags", "GetTags(${1:instance})", "CollectionService method", "Returns tags."], ["GetTagged", "GetTagged(\"${1:Tag}\")", "CollectionService method", "Returns tagged instances."], ["GetInstanceAddedSignal", "GetInstanceAddedSignal(\"${1:Tag}\")", "CollectionService method", "Signal for tagged instance added."], ["GetInstanceRemovedSignal", "GetInstanceRemovedSignal(\"${1:Tag}\")", "CollectionService method", "Signal for tagged instance removed."]] },
	UserInputService: { methods: [["GetMouseLocation", "GetMouseLocation()", "UserInputService method", "Returns mouse screen location."], ["IsKeyDown", "IsKeyDown(Enum.KeyCode.${1:E})", "UserInputService method", "Checks keyboard state."], ["IsMouseButtonPressed", "IsMouseButtonPressed(Enum.UserInputType.MouseButton${1:1})", "UserInputService method", "Checks mouse button state."], ["GetKeysPressed", "GetKeysPressed()", "UserInputService method", "Returns pressed keys."], ["GetFocusedTextBox", "GetFocusedTextBox()", "UserInputService method", "Returns focused TextBox."]], events: [["InputBegan", "InputBegan:Connect(function(${1:input}, ${2:gameProcessed})\n\t${3}\nend)", "UserInputService event", "Input began."], ["InputEnded", "InputEnded:Connect(function(${1:input}, ${2:gameProcessed})\n\t${3}\nend)", "UserInputService event", "Input ended."], ["InputChanged", "InputChanged:Connect(function(${1:input}, ${2:gameProcessed})\n\t${3}\nend)", "UserInputService event", "Input changed."]] },
	ContextActionService: { methods: [["BindAction", "BindAction(\"${1:ActionName}\", function(${2:actionName}, ${3:inputState}, ${4:inputObject})\n\t${5}\nend, ${6:false}, Enum.KeyCode.${7:E})", "ContextActionService method", "Binds input action."], ["BindActionAtPriority", "BindActionAtPriority(\"${1:ActionName}\", function(${2:actionName}, ${3:inputState}, ${4:inputObject})\n\t${5}\nend, ${6:false}, ${7:2000}, Enum.KeyCode.${8:E})", "ContextActionService method", "Binds priority action."], ["UnbindAction", "UnbindAction(\"${1:ActionName}\")", "ContextActionService method", "Unbinds action."], ["GetAllBoundActionInfo", "GetAllBoundActionInfo()", "ContextActionService method", "Returns bound actions."]] },
	HttpService: { methods: [["JSONEncode", "JSONEncode(${1:data})", "HttpService method", "Encodes JSON."], ["JSONDecode", "JSONDecode(${1:json})", "HttpService method", "Decodes JSON."], ["GenerateGUID", "GenerateGUID(${1:false})", "HttpService method", "Generates GUID."], ["UrlEncode", "UrlEncode(\"${1:text}\")", "HttpService method", "URL encodes text."], ["RequestAsync", "RequestAsync({\n\tUrl = \"${1:https://example.com}\",\n\tMethod = \"GET\",\n})", "HttpService method", "Performs HTTP request."], ["GetAsync", "GetAsync(\"${1:https://example.com}\")", "HttpService method", "HTTP GET."], ["PostAsync", "PostAsync(\"${1:https://example.com}\", ${2:body})", "HttpService method", "HTTP POST."]] },
	DataStoreService: { methods: [["GetDataStore", "GetDataStore(\"${1:Data}\")", "DataStoreService method", "Gets a DataStore."], ["GetOrderedDataStore", "GetOrderedDataStore(\"${1:Leaderboard}\")", "DataStoreService method", "Gets an OrderedDataStore."], ["ListDataStoresAsync", "ListDataStoresAsync(\"${1:Prefix}\")", "DataStoreService method", "Lists DataStores."]] },
	MemoryStoreService: { methods: [["GetQueue", "GetQueue(\"${1:QueueName}\")", "MemoryStoreService method", "Gets MemoryStoreQueue."], ["GetSortedMap", "GetSortedMap(\"${1:MapName}\")", "MemoryStoreService method", "Gets MemoryStoreSortedMap."], ["GetHashMap", "GetHashMap(\"${1:HashMapName}\")", "MemoryStoreService method", "Gets MemoryStoreHashMap."]] },
	TeleportService: { methods: [["TeleportAsync", "TeleportAsync(${1:placeId}, ${2:players}, ${3:teleportOptions})", "TeleportService method", "Teleports players."], ["ReserveServer", "ReserveServer(${1:placeId})", "TeleportService method", "Reserves a private server."], ["TeleportToPrivateServer", "TeleportToPrivateServer(${1:placeId}, ${2:accessCode}, ${3:players})", "TeleportService method", "Teleports to reserved server."], ["GetPlayerPlaceInstanceAsync", "GetPlayerPlaceInstanceAsync(${1:userId})", "TeleportService method", "Finds player's current place instance."]] },
	MarketplaceService: { methods: [["UserOwnsGamePassAsync", "UserOwnsGamePassAsync(${1:userId}, ${2:gamePassId})", "MarketplaceService method", "Checks gamepass ownership."], ["PlayerOwnsAsset", "PlayerOwnsAsset(${1:player}, ${2:assetId})", "MarketplaceService method", "Checks asset ownership."], ["PromptGamePassPurchase", "PromptGamePassPurchase(${1:player}, ${2:gamePassId})", "MarketplaceService method", "Prompts gamepass purchase."], ["PromptProductPurchase", "PromptProductPurchase(${1:player}, ${2:productId})", "MarketplaceService method", "Prompts dev product purchase."], ["GetProductInfo", "GetProductInfo(${1:assetId}, Enum.InfoType.Asset)", "MarketplaceService method", "Gets product info."]], events: [["PromptGamePassPurchaseFinished", "PromptGamePassPurchaseFinished:Connect(function(${1:player}, ${2:gamePassId}, ${3:wasPurchased})\n\t${4}\nend)", "MarketplaceService event", "Gamepass prompt finished."], ["ProcessReceipt", "ProcessReceipt = function(${1:receiptInfo})\n\t${2}\n\treturn Enum.ProductPurchaseDecision.PurchaseGranted\nend", "MarketplaceService callback", "Developer product receipt callback."]] },
	Debris: { methods: [["AddItem", "AddItem(${1:instance}, ${2:5})", "Debris method", "Schedules an instance for destruction."]] },
	PathfindingService: { methods: [["CreatePath", "CreatePath(${1:agentParameters})", "PathfindingService method", "Creates Path object."], ["FindPathAsync", "FindPathAsync(${1:start}, ${2:finish})", "PathfindingService method", "Computes path."]] },
	PhysicsService: { methods: [["RegisterCollisionGroup", "RegisterCollisionGroup(\"${1:GroupName}\")", "PhysicsService method", "Creates collision group."], ["CollisionGroupSetCollidable", "CollisionGroupSetCollidable(\"${1:A}\", \"${2:B}\", ${3:false})", "PhysicsService method", "Sets group collision."], ["GetCollisionGroups", "GetCollisionGroups()", "PhysicsService method", "Returns collision groups."]] },
	SoundService: { methods: [["PlayLocalSound", "PlayLocalSound(${1:sound})", "SoundService method", "Plays sound locally."], ["GetListener", "GetListener()", "SoundService method", "Returns listener."], ["SetListener", "SetListener(Enum.ListenerType.${1:Camera}, ${2:camera})", "SoundService method", "Sets listener."]] },
	Lighting: { methods: [["GetMinutesAfterMidnight", "GetMinutesAfterMidnight()", "Lighting method", "Gets current time in minutes."], ["SetMinutesAfterMidnight", "SetMinutesAfterMidnight(${1:720})", "Lighting method", "Sets current time in minutes."]] },
	BadgeService: { methods: [["AwardBadge", "AwardBadge(${1:userId}, ${2:badgeId})", "BadgeService method", "Awards badge."], ["UserHasBadgeAsync", "UserHasBadgeAsync(${1:userId}, ${2:badgeId})", "BadgeService method", "Checks badge ownership."]] },
	Teams: { methods: [["GetTeams", "GetTeams()", "Teams method", "Returns all Team children."]] },
};

export const CLASS_HINTS = {
	model: "Model",
	character: "Model",
	part: "BasePart",
	basepart: "BasePart",
	rootpart: "BasePart",
	humanoidrootpart: "BasePart",
	humanoid: "Humanoid",
	player: "Player",
	plr: "Player",
	remote: "RemoteEvent",
	remoteevent: "RemoteEvent",
	remotefunction: "RemoteFunction",
	tween: "Tween",
	tool: "Tool",
};

export const EXTRA_CLASS_COMPLETIONS = {
	Model: { methods: [...PV_INSTANCE_METHODS, ...MODEL_METHODS], events: COMMON_EVENTS, properties: ["PrimaryPart", "WorldPivot", "ModelStreamingMode", "LevelOfDetail"] },
	BasePart: { methods: [...PV_INSTANCE_METHODS, ...BASE_PART_METHODS], events: [["Touched", "Touched:Connect(function(${1:hit})\n\t${2}\nend)", "BasePart event", "Fires when touched."], ["TouchEnded", "TouchEnded:Connect(function(${1:hit})\n\t${2}\nend)", "BasePart event", "Fires when touch ends."]], properties: ["Position", "CFrame", "Size", "Orientation", "AssemblyLinearVelocity", "Anchored", "CanCollide", "CanTouch", "CanQuery", "Transparency", "Color", "Material"] },
	Tool: { methods: [["Activate", "Activate()", "Tool method", "Activates the tool."], ["Deactivate", "Deactivate()", "Tool method", "Deactivates the tool."]], events: [["Activated", "Activated:Connect(function()\n\t${1}\nend)", "Tool event", "Tool activated."], ["Equipped", "Equipped:Connect(function(${1:mouse})\n\t${2}\nend)", "Tool event", "Tool equipped."], ["Unequipped", "Unequipped:Connect(function()\n\t${1}\nend)", "Tool event", "Tool unequipped."]], properties: ["Enabled", "RequiresHandle", "CanBeDropped", "Grip"] },
	Tween: { methods: [["Play", "Play()", "Tween method", "Starts tween."], ["Pause", "Pause()", "Tween method", "Pauses tween."], ["Cancel", "Cancel()", "Tween method", "Cancels tween."]], events: [["Completed", "Completed:Connect(function(${1:playbackState})\n\t${2}\nend)", "Tween event", "Fires when tween completes."]], properties: ["PlaybackState"] },
};

export const SNIPPETS = [
	["local service = game:GetService", "local ${1:Players} = game:GetService(\"${1:Players}\")", "Snippet", "Creates a typed service variable."],
	["safe service block", "local Players = game:GetService(\"Players\")\nlocal ReplicatedStorage = game:GetService(\"ReplicatedStorage\")\n\n", "Snippet", "Common service setup."],
	["Instance.new", "local ${1:object} = Instance.new(\"${2:Folder}\")\n${1:object}.Name = \"${3:Name}\"\n${1:object}.Parent = ${4:parent}", "Snippet", "Create, name and parent an instance."],
	["local WaitForChild", "local ${1:child} = ${2:parent}:WaitForChild(\"${3:Name}\")", "Snippet", "Create a safe child reference."],
	["safe FindFirstChild", "local ${1:child} = ${2:parent}:FindFirstChild(\"${3:Name}\")\n\nif not ${1:child} then\n\treturn\nend", "Snippet", "Find child and guard nil."],
	["Players.PlayerAdded", "local Players = game:GetService(\"Players\")\n\nlocal function onPlayerAdded(player)\n\t${1}\nend\n\nfor _, player in ipairs(Players:GetPlayers()) do\n\ttask.spawn(onPlayerAdded, player)\nend\n\nPlayers.PlayerAdded:Connect(onPlayerAdded)", "Snippet", "Handles existing and joining players."],
	["CharacterAdded safe", "local function onCharacterAdded(character)\n\tlocal humanoid = character:WaitForChild(\"Humanoid\")\n\tlocal rootPart = character:WaitForChild(\"HumanoidRootPart\")\n\t${1}\nend\n\nif player.Character then\n\ttask.spawn(onCharacterAdded, player.Character)\nend\n\nplayer.CharacterAdded:Connect(onCharacterAdded)", "Snippet", "Safe character setup."],
	["RemoteEvent server", "local ReplicatedStorage = game:GetService(\"ReplicatedStorage\")\nlocal Remote = ReplicatedStorage:WaitForChild(\"${1:RemoteName}\")\n\nRemote.OnServerEvent:Connect(function(player, ${2:...})\n\t${3}\nend)", "Snippet", "Server RemoteEvent listener."],
	["RemoteEvent client", "local ReplicatedStorage = game:GetService(\"ReplicatedStorage\")\nlocal Remote = ReplicatedStorage:WaitForChild(\"${1:RemoteName}\")\n\nRemote.OnClientEvent:Connect(function(${2:...})\n\t${3}\nend)", "Snippet", "Client RemoteEvent listener."],
	["CollectionService:GetTagged", "local CollectionService = game:GetService(\"CollectionService\")\n\nfor _, instance in ipairs(CollectionService:GetTagged(\"${1:Tag}\")) do\n\t${2}\nend", "Snippet", "Loop tagged instances."],
	["TweenService:Create", "local TweenService = game:GetService(\"TweenService\")\n\nlocal tween = TweenService:Create(${1:instance}, TweenInfo.new(${2:0.25}, Enum.EasingStyle.${3:Quad}, Enum.EasingDirection.${4:Out}), {\n\t${5:Transparency} = ${6:1},\n})\n\ntween:Play()", "Snippet", "Create and play a tween."],
	["Raycast", "local raycastParams = RaycastParams.new()\nraycastParams.FilterType = Enum.RaycastFilterType.${1:Exclude}\nraycastParams.FilterDescendantsInstances = {${2}}\n\nlocal result = workspace:Raycast(${3:origin}, ${4:direction}, raycastParams)\n\nif result then\n\t${5}\nend", "Snippet", "Workspace raycast pattern."],
	["task.spawn", "task.spawn(function()\n\t${1}\nend)", "Snippet", "Runs code asynchronously."],
	["task.delay", "task.delay(${1:1}, function()\n\t${2}\nend)", "Snippet", "Runs code after delay."],
	["pcall", "local success, result = pcall(function()\n\t${1}\nend)\n\nif not success then\n\twarn(result)\n\treturn\nend", "Snippet", "Protected call with guard."],
	["local function", "local function ${1:name}(${2})\n\t${3}\nend", "Snippet", "Creates a local function."],
	["Module pattern", "local ${1:Module} = {}\n\nfunction ${1:Module}.${2:Method}(${3})\n\t${4}\nend\n\nreturn ${1:Module}", "Snippet", "Clean ModuleScript pattern."],
];
