//go:build wireinject
// +build wireinject

package core

import (
	"github.com/Xwudao/go-revjs/internal/system"
	"github.com/google/wire"

	"github.com/Xwudao/go-revjs/pkg/config"
	"github.com/Xwudao/go-revjs/pkg/logger"
)

// func CmdApp() (*App, func(), error) {
// 	panic(wire.Build(
// 		NewApp,
// 		logger.NewLogger,
// 		config.NewKoanf,
// 		config.NewConfig,
// 	))
// }

func TestApp() (*Test, func(), error) {
	panic(wire.Build(
		NewTestApp,
		system.NewTestAppContext,
		config.NewTestConfig,
		logger.NewTestLogger,
	))
}
