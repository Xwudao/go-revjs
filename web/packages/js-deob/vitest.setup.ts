import { expect } from 'vitest'
import astSerializer from './vitest.ast-serializer'

expect.addSnapshotSerializer(astSerializer)