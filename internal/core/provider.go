package core

import (
	"github.com/Xwudao/go-revjs/internal/system"
	"github.com/google/wire"
)

var ProviderCoreSet = wire.NewSet(system.NewAppContext)
