//go:build wireinject
// +build wireinject

package cmd_app

import (
	"github.com/Xwudao/go-revjs/internal/system"
	"github.com/Xwudao/go-revjs/pkg/config"
	"github.com/Xwudao/go-revjs/pkg/logger"
	"github.com/google/wire"
)

func MigrateCmd() (*MigrateApp, func(), error) {
	panic(wire.Build(
		NewMigrateApp,
		system.NewAppContext,
		logger.NewLogger,
		config.NewKoanf,
	))
}

func InitCmd() (*InitApp, func(), error) {
	panic(wire.Build(NewInitApp))
}
